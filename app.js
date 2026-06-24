/**
 * app.js
 * Express application setup
 * All backend files live under api/
 */

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");

const env = require("./api/config/env");

const app = express();

// ─── Core Middleware ───────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: env.cors.origins, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    app: env.app.name,
    version: "1.0.0",
    timestamp: new Date(),
  });
});

// ─── Route Loader ─────────────────────────────────────────────────────────────
// Loads each route file from api/routes/
// Skips gracefully if a file is missing instead of crashing

function loadRoute(routeName, mountPath) {
  const routePath = path.join(__dirname, "api", "routes", routeName);

  if (fs.existsSync(routePath + ".js")) {
    app.use(mountPath, require(routePath));
    console.log(`✅ Route loaded: ${mountPath}`);
  } else {
    console.warn(`⚠️  Route missing: api/routes/${routeName}.js — skipping ${mountPath}`);
  }
}

// ─── Register all routes ──────────────────────────────────────────────────────
loadRoute("dashboard", "/api/dashboard");
loadRoute("savings", "/api/savings");
loadRoute("loans", "/api/loans");
loadRoute("interest", "/api/interest");
loadRoute("members", "/api/members");
loadRoute("transactions", "/api/transactions");
loadRoute("reports", "/api/reports");
loadRoute("settings", "/api/settings");
loadRoute("auth", "/api/auth");

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
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
