/**
 * app.js
 * Express application setup
 * All backend files live under backend/
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

const env = require("./backend/config/env");

const app = express();
app.set("etag", false);

// --- Core Middleware ---
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Health Check ---
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    app: env.app.name,
    version: "1.0.0",
    timestamp: new Date(),
  });
});

// --- Keep-alive (stops Render's free plan from sleeping the backend) ---
// Render sets RENDER_EXTERNAL_URL automatically (your public backend address).
// The ping must go to the PUBLIC address, because only outside traffic
// counts as activity. Render sleeps free services after ~15 minutes of
// no traffic, so we ping every 10 minutes.
const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL;
const KEEP_ALIVE_MS = 10 * 60 * 1000;

if (KEEP_ALIVE_URL && typeof fetch === "function") {
  const timer = setInterval(async () => {
    try {
      const res = await fetch(`${KEEP_ALIVE_URL}/api/health`);
      console.log(`🔁 Keep-alive ping → ${res.status}`);
    } catch (err) {
      console.warn(`⚠️  Keep-alive ping failed: ${err.message}`);
    }
  }, KEEP_ALIVE_MS);

  // Don't let the timer block a clean shutdown
  timer.unref();
}

// --- Route Loader ---
// Loads each route file from backend/routes/
// Skips gracefully if a file is missing instead of crashing
// NOTE: file names are case-sensitive on Linux (Render)

function loadRoute(routeName, mountPath) {
  const routePath = path.join(__dirname, "backend", "routes", routeName);

  if (fs.existsSync(routePath + ".js")) {
    app.use(mountPath, require(routePath));
    console.log(`✅ Route loaded: ${mountPath}`);
  } else {
    console.warn(`⚠️  Route missing: backend/routes/${routeName}.js - skipping ${mountPath}`);
  }
}

// --- Register all routes ---
loadRoute("dashboard", "/api/dashboard");
loadRoute("savings", "/api/savings");
loadRoute("loans", "/api/loans");
loadRoute("interest", "/api/interest");
loadRoute("members", "/api/members");
loadRoute("transactions", "/api/transactions");
loadRoute("reports", "/api/reports");
loadRoute("settings", "/api/settings");
loadRoute("auth", "/api/auth");

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// --- Global Error Handler ---
// Must have 4 parameters for Express to treat it as an error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;