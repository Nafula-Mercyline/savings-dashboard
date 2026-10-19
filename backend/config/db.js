
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
const env = require("./env");

// ─── Dialect-specific options (single, merged block) ─────────────────────────
// NOTE: dialectOptions must only be defined ONCE. A second key with the same
// name silently overrides the first, which previously dropped the SSL config.

const isMySQL = env.db.dialect === "mysql" || env.db.dialect === "mariadb";

// Aiven requires SSL. Set DB_SSL=false in .env only for a local, non-SSL DB.
const useSSL = process.env.DB_SSL !== "false";

const dialectOptions = {};

if (isMySQL) {
  // Allows reading BIGINT as JavaScript Number (not string)
  dialectOptions.supportBigNumbers = true;
  dialectOptions.bigNumberStrings = false;
  // Enables proper timezone handling
  dialectOptions.dateStrings = false;
  // Give the TLS handshake enough time on slow networks
  dialectOptions.connectTimeout = 60000;
  // Keep the TCP connection alive so the remote server / network does not
  // silently close idle connections ("connection is in closed state").
  dialectOptions.enableKeepAlive = true;
  dialectOptions.keepAliveInitialDelay = 10000;
  dialectOptions.typeCast = function (field, next) {
    if (field.type === "DATETIME" || field.type === "TIMESTAMP") {
      const value = field.string();
      return value === null ? null : new Date(value);
    }
    return next();
  };
}

if (useSSL) {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: false,
  };
}

// ─── Create Sequelize Instance ────────────────────────────────────────────────

const sequelize = new Sequelize(
  env.db.name,
  env.db.user,
  env.db.pass,
  {
    host: env.db.host,
    port: env.db.port,
    dialect: env.db.dialect,

    dialectOptions,

    // ── Connection Pool ───────────────────────────────────────────────────
    // For a remote database: keep no idle minimum (so dead connections are not
    // kept around), drop idle connections quickly, and wait long enough to
    // open a new one on a slow network.
    pool: {
      max: env.db.pool.max || 5,
      min: 0,
      acquire: Math.max(env.db.pool.acquire || 0, 60000),
      idle: Math.min(env.db.pool.idle || 10000, 10000),
      evict: 5000,
    },

    // ── Retry on dropped connections ──────────────────────────────────────
    retry: {
      max: 3,
      match: [
        /closed state/i,
        /ECONNRESET/,
        /ETIMEDOUT/,
        /EPIPE/,
        /PROTOCOL_CONNECTION_LOST/,
        /SequelizeConnectionError/,
      ],
    },

    // ── Logging ───────────────────────────────────────────────────────────
    logging: env.db.logging
      ? (sql, timing) => {
        console.log(`\n[SQL] ${sql}${timing ? ` — ${timing}ms` : ""}`);
      }
      : false,

    // ── Global Model Options ──────────────────────────────────────────────
    define: {
      underscored: false,
      timestamps: true,
      freezeTableName: false,
      paranoid: false,
    },

    // ── Timezone ──────────────────────────────────────────────────────────
    timezone: "+00:00",
  }
);

// ─── Connection Test ──────────────────────────────────────────────────────────

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
 * @param {"safe"|"alter"|"force"} mode — default "safe"
 */
sequelize.syncModels = async function (mode = "safe") {
  const options = {
    safe: {},
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
