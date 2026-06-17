/**
 * api/config/env.js
 *
 * Environment Variable Loader & Validator.
 * Loads .env via dotenv, validates required variables,
 * and exports a typed, centralised config object.
 *
 * Import this ONCE at the top of server.js before anything else:
 *   require("./config/env");
 *
 * Then use the exported config anywhere:
 *   const env = require("../config/env");
 *   console.log(env.db.name);
 *
 * Requires: npm install dotenv
 */

const path   = require("path");
const dotenv = require("dotenv");

// ─── Load .env file ───────────────────────────────────────────────────────────

const envFile = process.env.NODE_ENV === "test"
  ? ".env.test"
  : ".env";

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// ─── Required variable validator ──────────────────────────────────────────────

/**
 * Throws a descriptive error if any required env variable is missing.
 * Call this once at startup so problems surface immediately.
 *
 * @param {string[]} required — list of required variable names
 */
function requireEnvVars(required) {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(
      `\n❌  Missing required environment variables:\n` +
      missing.map((k) => `    - ${k}`).join("\n") +
      `\n\nPlease check your .env file.\n`
    );
  }
}

// ─── Validate required variables ──────────────────────────────────────────────

requireEnvVars([
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  
  "JWT_SECRET",
]);

// ─── Config object ────────────────────────────────────────────────────────────

const env = {

  // ── Application ──────────────────────────────────────────────────────────
  app: {
    name:     process.env.APP_NAME     || "savings",
    url:      process.env.APP_URL      || "http://localhost:3000",
    port:     parseInt(process.env.PORT, 10) || 5000,
    env:      process.env.NODE_ENV     || "development",
    isProduction:  process.env.NODE_ENV === "production",
    isDevelopment: process.env.NODE_ENV === "development",
    isTest:        process.env.NODE_ENV === "test",
  },

  // ── Database ──────────────────────────────────────────────────────────────
  db: {
    host:     process.env.DB_HOST     || "localhost",
    port:     parseInt(process.env.DB_PORT, 10) || 3306,
    name:     process.env.DB_NAME,
    user:     process.env.DB_USER,
    pass:     process.env.DB_PASS,
    dialect:  process.env.DB_DIALECT  || "mysql",   // mysql | postgres | sqlite
    logging:  process.env.DB_LOGGING  === "true",   // set DB_LOGGING=true to see SQL
    pool: {
      max:     parseInt(process.env.DB_POOL_MAX,  10) || 10,
      min:     parseInt(process.env.DB_POOL_MIN,  10) || 2,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle:    parseInt(process.env.DB_POOL_IDLE,    10) || 10000,
    },
  },

  // ── JWT ───────────────────────────────────────────────────────────────────
  jwt: {
    secret:         process.env.JWT_SECRET,
    expiresIn:      process.env.JWT_EXPIRES_IN      || "8h",
    refreshSecret:  process.env.JWT_REFRESH_SECRET  || process.env.JWT_SECRET,
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
  },

  // ── Email / SMTP ──────────────────────────────────────────────────────────
  mail: {
    host:      process.env.SMTP_HOST       || "sandbox.smtp.mailtrap.io",
    port:      parseInt(process.env.SMTP_PORT, 10) || 2525,
    user:      process.env.SMTP_USER       || "",
    pass:      process.env.SMTP_PASS       || "",
    fromName:  process.env.SMTP_FROM_NAME  || "savings",
    fromEmail: process.env.SMTP_FROM_EMAIL || "no-reply@savings.com",
    // Mailtrap credentials (development only)
    mailtrapUser: process.env.MAILTRAP_USER || "",
    mailtrapPass: process.env.MAILTRAP_PASS || "",
  },

  // ── CORS ─────────────────────────────────────────────────────────────────
  cors: {
    // Comma-separated list of allowed origins e.g.
    //   CORS_ORIGINS=http://localhost:3000,https://myapp.com
    origins: (process.env.CORS_ORIGINS || "http://localhost:3000")
      .split(",")
      .map((o) => o.trim()),
  },

  // ── Security ─────────────────────────────────────────────────────────────
  security: {
    bcryptRounds:       parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    maxLoginAttempts:   parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5,
    lockoutDurationMins: parseInt(process.env.LOCKOUT_DURATION_MINS, 10) || 30,
    passwordResetExpires: parseInt(process.env.PASSWORD_RESET_EXPIRES, 10) || 3600000,
  },

  // ── Financial Defaults ────────────────────────────────────────────────────
  finance: {
    defaultSavingsRate: parseFloat(process.env.DEFAULT_SAVINGS_RATE) || 0.08,
    defaultLoanRate:    parseFloat(process.env.DEFAULT_LOAN_RATE)    || 0.12,
    currency:           process.env.CURRENCY                         || "UGX",
    locale:             process.env.LOCALE                           || "en-UG",
  },

  // ── Pagination ────────────────────────────────────────────────────────────
  pagination: {
    defaultLimit: parseInt(process.env.DEFAULT_PAGE_LIMIT, 10) || 20,
    maxLimit:     parseInt(process.env.MAX_PAGE_LIMIT, 10)     || 100,
  },

  // ── File Storage (future: S3 / local uploads) ─────────────────────────────
  storage: {
    driver:    process.env.STORAGE_DRIVER    || "local",  // "local" | "s3"
    localPath: process.env.STORAGE_LOCAL_PATH || "./uploads",
    s3: {
      bucket:    process.env.AWS_S3_BUCKET    || "",
      region:    process.env.AWS_REGION       || "us-east-1",
      accessKey: process.env.AWS_ACCESS_KEY   || "",
      secretKey: process.env.AWS_SECRET_KEY   || "",
    },
  },
};

// ─── Freeze to prevent accidental mutation ────────────────────────────────────
Object.freeze(env);
Object.freeze(env.app);
Object.freeze(env.db);
Object.freeze(env.db.pool);
Object.freeze(env.jwt);
Object.freeze(env.mail);
Object.freeze(env.cors);
Object.freeze(env.security);
Object.freeze(env.finance);
Object.freeze(env.pagination);
Object.freeze(env.storage);
Object.freeze(env.storage.s3);

module.exports = env;


