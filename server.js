/**
 * server.js
 * Entry point for the Savings Dashboard API
 */

require("./api/config/env");

const app           = require("./app");
const { sequelize } = require("./api/models");
const Role          = require("./api/models/Role");
const Setting       = require("./api/models/Setting");

const PORT = process.env.PORT || 5000;
const ENV  = process.env.NODE_ENV || "development";

async function start() {
  try {

    // 1. Test database connection
    await sequelize.authenticate();

    // 2. Sync all models to the database
    if (ENV === "development") {
      await sequelize.syncModels("alter");
    } else {
      await sequelize.syncModels("safe");
    }

    // 3. Seed roles, permissions, role_permissions
    await Role.seedAll();

    // 4. Seed default settings
    await Setting.seed();

    // 5. Start HTTP server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running    → http://localhost:${PORT}`);
      console.log(`📦 Environment       → ${ENV}`);
      console.log(`🗄️  Database          → ${process.env.DB_DIALECT}://${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
      console.log(`🔗 Health check      → http://localhost:${PORT}/api/health\n`);
    });

  } catch (err) {
    console.error("\n❌ Server failed to start:");
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