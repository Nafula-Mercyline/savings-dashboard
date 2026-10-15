/**
 * api/controllers/settingsController.js
 * Thin HTTP layer for settings.
 */

const settingsService = require("../services/settingsService");

// GET /api/settings
exports.getAllSettings = async (req, res, next) => {
  try {
    const { group = "all" } = req.query;
    const data = await settingsService.getAllSettings({ group });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /api/settings/public
exports.getPublicSettings = async (req, res, next) => {
  try {
    const data = await settingsService.getPublicSettings();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /api/settings/financial
exports.getFinancialSettings = async (req, res, next) => {
  try {
    const data = await settingsService.getFinancialSettings();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// GET /api/settings/:key
exports.getSettingByKey = async (req, res, next) => {
  try {
    const data = await settingsService.getSettingByKey(req.params.key);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// PUT /api/settings
exports.updateSettings = async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ success: false, message: "Request body must be a key-value object" });
    }
    const data = await settingsService.updateSettings(req.body);
    res.json({ success: true, message: "Settings updated", data });
  } catch (err) { next(err); }
};

// PUT /api/settings/:key/reset
exports.resetSetting = async (req, res, next) => {
  try {
    const data = await settingsService.resetSetting(req.params.key);
    res.json({ success: true, message: `Setting "${req.params.key}" reset to default`, data });
  } catch (err) { next(err); }
};
