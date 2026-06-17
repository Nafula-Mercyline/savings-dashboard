/**
 * api/config/db.js
 *
 * Sequelize Database Connection
 * Creates and exports a single Sequelize instance shared across all models.
 *
 * Supports: MySQL, PostgreSQL, SQLite (set DB_DIALECT in .env)
 *
 * Usage in models:
 *   const sequelize = require("../config/db");
 *   const { DataTypes } = require("sequelize");
 *   const User = sequelize.define("User", { ... });
 *
 * Usage in server.js:
 *   const db = require("./config/db");
 *   await db.authenticate();
 *   await db.sync({ alter: true }); // dev only
 *
 * Requires: npm install sequelize mysql2
 *           (or: pg pg-hstore for PostgreSQL, sqlite3 for SQLite)
 */

const { Sequelize } = require("sequelize");
const env           = require("./env");

// ─── Create Sequelize Instance ────────────────────────────────────────────────

const sequelize = new Sequelize(
  env.db.name,
  env.db.user,
  env.db.pass,
  {
    host:    env.db.host,
    port:    env.db.port,
    dialect: env.db.dialect,

    // ── Connection Pool ───────────────────────────────────────────────────
    // Keeps a pool of reusable DB connections instead of opening a new one
    // per query — critical for performance under load.
    pool: {
      max:     env.db.pool.max,     // maximum simultaneous connections
      min:     env.db.pool.min,     // minimum idle connections kept open
      acquire: env.db.pool.acquire, // ms to wait before throwing "connection timeout"
      idle:    env.db.pool.idle,    // ms a connection can sit idle before release
    },

    // ── Logging ───────────────────────────────────────────────────────────
    // Only log SQL queries when DB_LOGGING=true in .env.
    // In production this should always be false.
    logging: env.db.logging
      ? (sql, timing) => {
          console.log(`\n[SQL] ${sql}${timing ? ` — ${timing}ms` : ""}`);
        }
      : false,

    // ── Dialect-specific Options ──────────────────────────────────────────
    dialectOptions: env.db.dialect === "mysql" || env.db.dialect === "mariadb"
      ? {
          // Allows reading BIGINT as JavaScript Number (not string)
          supportBigNumbers: true,
          bigNumberStrings:  false,
          // Enables proper timezone handling
          dateStrings: false,
          typeCast(field, next) {
            if (field.type === "DATETIME" || field.type === "TIMESTAMP") {
              return new Date(field.string());
            }
            return next();
          },
        }
      : {},

    // ── Global Model Options ──────────────────────────────────────────────
    define: {
      // Use snake_case column names in the DB (firstName → first_name)
      underscored:    false,
      // Auto-add createdAt and updatedAt timestamps to every model
      timestamps:     true,
      // Don't pluralise table names (Member → Members by default — disable this)
      freezeTableName: false,
      // Use paranoid soft-deletes where applicable (adds deletedAt)
      // Set paranoid: true on individual models that need soft-delete
      paranoid:       false,
    },

    // ── Timezone ──────────────────────────────────────────────────────────
    // Store all timestamps in UTC
    timezone: "+00:00",
  }
);

// ─── Connection Test ──────────────────────────────────────────────────────────

/**
 * Tests the database connection and logs the result.
 * Called from server.js before starting the HTTP server.
 *
 * Usage:
 *   const db = require("./config/db");
 *   await db.authenticate();
 */
const originalAuthenticate = sequelize.authenticate.bind(sequelize);
sequelize.authenticate = async function () {
  try {
    await originalAuthenticate();
    console.log(
      `✅ Database connected [${env.db.dialect}] → ${env.db.host}:${env.db.port}/${env.db.name}`
    );
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
    throw err;
  }
};

// ─── Sync Helper ──────────────────────────────────────────────────────────────

/**
 * Syncs all registered models to the database.
 *
 * Modes:
 *   "safe"  — CREATE TABLE IF NOT EXISTS (default, safe for production)
 *   "alter" — ALTER TABLE to match model (dev only, non-destructive)
 *   "force" — DROP + CREATE (destructive — wipes all data, dev only)
 *
 * Usage in server.js:
 *   await db.syncModels("alter");  // development
 *   await db.syncModels("safe");   // production
 *
 * @param {"safe"|"alter"|"force"} mode — default "safe"
 */
sequelize.syncModels = async function (mode = "safe") {
  const options = {
    safe:  {},
    alter: { alter: true },
    force: { force: true },
  };

  if (!options[mode]) {
    throw new Error(`Invalid sync mode "${mode}". Use "safe", "alter", or "force".`);
  }

  if (mode === "force" && env.app.isProduction) {
    throw new Error("syncModels('force') is not allowed in production.");
  }

  await sequelize.sync(options[mode]);
  console.log(`✅ Database models synced [mode: ${mode}]`);
};

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = sequelize;


// ─── .env template ───────────────────────────────────────────────────────────
//
// Copy the block below into your .env file and fill in your values:
//
// # Database
// DB_HOST=localhost
// DB_PORT=3306
// DB_NAME=umojasave_db
// DB_USER=root
// DB_PASS=yourpassword
// DB_DIALECT=mysql
// DB_LOGGING=false
// DB_POOL_MAX=10
// DB_POOL_MIN=2
// DB_POOL_ACQUIRE=30000
// DB_POOL_IDLE=10000


