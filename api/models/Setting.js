/**
 * api/models/Setting.js
 * Sequelize model for system-wide settings.
 * Stores key-value pairs for all configurable options.
 */

const { DataTypes } = require("sequelize");
const sequelize     = require("../config/db");

const Setting = sequelize.define("Setting", {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  key: {
    type:      DataTypes.STRING(100),
    allowNull: false,
    unique:    true,
    comment:   "Setting key e.g. default_savings_rate",
  },
  value: {
    type:      DataTypes.TEXT,
    allowNull: true,
    comment:   "Setting value stored as string",
  },
  type: {
    type:         DataTypes.ENUM("string","number","boolean","json"),
    allowNull:    false,
    defaultValue: "string",
    comment:      "Data type of the value for correct parsing",
  },
  group: {
    type:         DataTypes.STRING(50),
    allowNull:    false,
    defaultValue: "general",
    comment:      "e.g. general, finance, email, security",
  },
  displayName: {
    type:      DataTypes.STRING(150),
    allowNull: true,
    comment:   "Human-readable label shown in settings UI",
  },
  description: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
  isPublic: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: false,
    comment:      "If true, accessible without admin auth",
  },
  isReadOnly: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: false,
    comment:      "If true, cannot be changed via API",
  },
}, {
  tableName:  "settings",
  timestamps: true,
  indexes: [
    { unique: true, fields: ["key"]   },
    { fields: ["group"]               },
  ],
});

// ─── Instance helper: get typed value ────────────────────────────────────────
Setting.prototype.getValue = function () {
  const val = this.value;
  switch (this.type) {
    case "number":  return parseFloat(val);
    case "boolean": return val === "true";
    case "json":    try { return JSON.parse(val); } catch { return null; }
    default:        return val;
  }
};

// ─── Static helper: get a setting value by key ────────────────────────────────
Setting.get = async function (key, fallback = null) {
  const setting = await Setting.findOne({ where: { key } });
  if (!setting) return fallback;
  return setting.getValue();
};

// ─── Static helper: set a setting value by key ───────────────────────────────
Setting.set = async function (key, value) {
  const setting = await Setting.findOne({ where: { key } });
  if (!setting) throw new Error(`Setting "${key}" not found`);
  if (setting.isReadOnly) throw new Error(`Setting "${key}" is read-only`);
  setting.value = String(value);
  await setting.save();
  return setting;
};

// ─── Default settings seed data ───────────────────────────────────────────────
Setting.getDefaults = () => [
  // General
  { key: "app_name",            value: "SavingsDashboard", type: "string",  group: "general",  displayName: "Application Name",          isPublic: true  },
  { key: "app_currency",        value: "UGX",              type: "string",  group: "general",  displayName: "Currency",                  isPublic: true  },
  { key: "app_locale",          value: "en-UG",            type: "string",  group: "general",  displayName: "Locale",                    isPublic: true  },
  { key: "app_timezone",        value: "Africa/Kampala",   type: "string",  group: "general",  displayName: "Timezone",                  isPublic: true  },

  // Finance
  { key: "default_savings_rate",value: "0.08",             type: "number",  group: "finance",  displayName: "Default Savings Rate",      description: "Annual interest rate on savings e.g. 0.08 = 8%"   },
  { key: "default_loan_rate",   value: "0.12",             type: "number",  group: "finance",  displayName: "Default Loan Rate",         description: "Annual interest rate on loans e.g. 0.12 = 12%"    },
  { key: "min_loan_amount",     value: "50000",            type: "number",  group: "finance",  displayName: "Minimum Loan Amount (UGX)"                                                                   },
  { key: "max_loan_amount",     value: "50000000",         type: "number",  group: "finance",  displayName: "Maximum Loan Amount (UGX)"                                                                   },
  { key: "max_loan_term_months",value: "60",               type: "number",  group: "finance",  displayName: "Maximum Loan Term (Months)"                                                                  },
  { key: "min_deposit_amount",  value: "1000",             type: "number",  group: "finance",  displayName: "Minimum Deposit Amount (UGX)"                                                                },
  { key: "allow_multiple_loans",value: "false",            type: "boolean", group: "finance",  displayName: "Allow Multiple Active Loans", description: "Allow a member to have more than one active loan" },

  // Email
  { key: "email_notifications", value: "true",             type: "boolean", group: "email",    displayName: "Enable Email Notifications"                                                                  },
  { key: "smtp_from_name",      value: "SavingsDashboard", type: "string",  group: "email",    displayName: "Email From Name"                                                                             },
  { key: "smtp_from_email",     value: "no-reply@savingsdashboard.com", type: "string", group: "email", displayName: "Email From Address"                                                                 },

  // Security
  { key: "max_login_attempts",  value: "5",                type: "number",  group: "security", displayName: "Max Login Attempts"                                                                          },
  { key: "lockout_duration_mins",value:"30",               type: "number",  group: "security", displayName: "Account Lockout Duration (Minutes)"                                                          },
  { key: "session_timeout_hours",value:"8",                type: "number",  group: "security", displayName: "Session Timeout (Hours)"                                                                     },

  // Pagination
  { key: "default_page_limit",  value: "20",               type: "number",  group: "general",  displayName: "Default Page Size"                                                                           },
];

/**
 * Seeds default settings into the database.
 * Safe to run multiple times — uses findOrCreate.
 */
Setting.seed = async function () {
  const defaults = Setting.getDefaults();
  let created = 0;

  for (const s of defaults) {
    const [, wasCreated] = await Setting.findOrCreate({
      where:    { key: s.key },
      defaults: s,
    });
    if (wasCreated) created++;
  }

  console.log(`✅ Settings seeded (${created} new, ${defaults.length - created} existing)`);
};

module.exports = Setting;