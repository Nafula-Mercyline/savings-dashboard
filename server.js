/**
 * server.js
 * Entry point for the Savings Dashboard API
 */

require("./backend/config/env");

const app = require("./app");
const express = require("express");
const { sequelize } = require("./backend/models");
const Role = require("./backend/models/Role");
const Setting = require("./backend/models/Setting");

const PORT = process.env.PORT || 5000;
const ENV = process.env.NODE_ENV || "development";

// Middleware configuration
app.use(express.json());

/**
 * Seeding runs hundreds of small transactions. Over a remote database (Aiven)
 * that is slow and can drop the connection, so it only runs when:
 *   - the roles table is empty (first run), or
 *   - RUN_SEED=true is set in .env (to force a re-seed).
 * A seeding failure is reported but does NOT stop the server.
 */
async function seedIfNeeded() {
  try {
    const force = process.env.RUN_SEED === "true";
    const roleCount = await Role.count();

    if (force || roleCount === 0) {
      console.log("🌱 Seeding roles and permissions...");
      await Role.seedAll();
    } else {
      console.log(`⏭️  Roles already seeded (${roleCount}) - skipping seed`);
    }

    await Setting.seed();
  } catch (err) {
    console.error("⚠️  Seeding failed, continuing without it:", err.message);
    console.error("    (Existing data is untouched. Set RUN_SEED=true in .env to retry.)");
  }
}

async function start() {
  try {
    // 1. Test database connection
    await sequelize.authenticate();

    // 2. Sync all models to the database safely
    // A simple sync() looks for missing tables but won't alter existing ones.
    await sequelize.sync();
    console.log("🔄 Database structural integrity checked cleanly.");

    // 3. Seed roles, permissions and default settings (only when needed)
    await seedIfNeeded();

    // 4. Start HTTP server bind
    app.listen(PORT, () => {
      console.log(`\n🚀 SACCO Backend running → http://localhost:${PORT}`);
      console.log(`📦 Environment         → ${ENV}`);
      console.log(`🗄️  Database          → ${process.env.DB_DIALECT}://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
      console.log(`🔗 Mounted Endpoint    → http://localhost:${PORT}/api/auth/login\n`);
    });

  } catch (err) {
    console.error("\n❌ Server failed to boot context:");
    console.error("   Message:", err.message);
    console.error("   Stack:  ", err.stack);
    process.exit(1);
  }
}

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  process.exit(1);
});

process.on("SIGINT", async () => {
  console.log("\n⏹️  Shutting down gracefully...");
  try {
    await sequelize.close();
    console.log("✅ Database connection closed");
  } catch (e) {
    console.error("Error closing DB:", e.message);
  }
  process.exit(0);
});

start();
