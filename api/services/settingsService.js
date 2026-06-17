/**
 * api/services/settingsService.js
 * Business logic for system settings.
 * Uses the Setting model (key-value store).
 */

const Setting = require("../models/Setting");

// ─── 1. Get All Settings ──────────────────────────────────────────────────────
exports.getAllSettings = async ({ group } = {}) => {
  const where = {};
  if (group && group !== "all") where.group = group;

  const settings = await Setting.findAll({
    where,
    order: [["group", "ASC"], ["key", "ASC"]],
  });

  // Group them by category for easier frontend rendering
  return settings.reduce((acc, s) => {
    if (!acc[s.group]) acc[s.group] = [];
    acc[s.group].push({
      key:         s.key,
      value:       s.getValue(),
      type:        s.type,
      displayName: s.displayName,
      description: s.description,
      isPublic:    s.isPublic,
      isReadOnly:  s.isReadOnly,
    });
    return acc;
  }, {});
};

// ─── 2. Get Single Setting ────────────────────────────────────────────────────
exports.getSettingByKey = async (key) => {
  const setting = await Setting.findOne({ where: { key } });
  if (!setting) throw Object.assign(new Error(`Setting "${key}" not found`), { status: 404 });
  return { key: setting.key, value: setting.getValue(), type: setting.type, group: setting.group };
};

// ─── 3. Update Settings ───────────────────────────────────────────────────────
exports.updateSettings = async (updates) => {
  const results = [];
  const errors  = [];

  for (const [key, value] of Object.entries(updates)) {
    try {
      const setting = await Setting.findOne({ where: { key } });

      if (!setting) {
        errors.push({ key, error: `Setting "${key}" not found` });
        continue;
      }
      if (setting.isReadOnly) {
        errors.push({ key, error: `Setting "${key}" is read-only` });
        continue;
      }

      setting.value = String(value);
      await setting.save();
      results.push({ key, value: setting.getValue() });
    } catch (err) {
      errors.push({ key, error: err.message });
    }
  }

  return { updated: results, errors };
};

// ─── 4. Get Financial Settings ────────────────────────────────────────────────
exports.getFinancialSettings = async () => {
  const keys = [
    "default_savings_rate",
    "default_loan_rate",
    "min_loan_amount",
    "max_loan_amount",
    "max_loan_term_months",
    "min_deposit_amount",
    "allow_multiple_loans",
    "app_currency",
  ];

  const settings = await Setting.findAll({ where: { key: keys } });

  return settings.reduce((acc, s) => {
    acc[s.key] = s.getValue();
    return acc;
  }, {});
};

// ─── 5. Get Public Settings ───────────────────────────────────────────────────
exports.getPublicSettings = async () => {
  const settings = await Setting.findAll({ where: { isPublic: true } });
  return settings.reduce((acc, s) => {
    acc[s.key] = s.getValue();
    return acc;
  }, {});
};

// ─── 6. Reset Setting to Default ─────────────────────────────────────────────
exports.resetSetting = async (key) => {
  const defaults  = Setting.getDefaults();
  const defaultVal = defaults.find((d) => d.key === key);

  if (!defaultVal) throw Object.assign(new Error(`No default found for "${key}"`), { status: 404 });

  const setting = await Setting.findOne({ where: { key } });
  if (!setting) throw Object.assign(new Error(`Setting "${key}" not found`), { status: 404 });
  if (setting.isReadOnly) throw Object.assign(new Error(`Setting "${key}" is read-only`), { status: 400 });

  setting.value = defaultVal.value;
  await setting.save();
  return { key: setting.key, value: setting.getValue() };
};