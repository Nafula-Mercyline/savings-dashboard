/**
 * api/routes/settings.js
 * Settings Routes
 * Base URL: /api/settings
 */

const express = require("express");
const router  = express.Router();

const settingsController = require("../controllers/settingsController");
const auth               = require("../middleware/auth");
const roles              = require("../middleware/roles");

// Apply auth to all settings routes
router.use(auth);

/**
 * GET /api/settings
 * Returns all settings grouped by category.
 * Query params: group — "general"|"finance"|"email"|"security"|"all"
 * Access: admin
 */
router.get(
  "/",
  roles(["admin"]),
  settingsController.getAllSettings
);

/**
 * GET /api/settings/public
 * Returns public settings (no auth required).
 * Access: everyone
 */
router.get(
  "/public",
  settingsController.getPublicSettings
);

/**
 * GET /api/settings/financial
 * Returns financial settings only.
 * Access: admin, treasurer
 */
router.get(
  "/financial",
  roles(["admin", "treasurer"]),
  settingsController.getFinancialSettings
);

/**
 * GET /api/settings/:key
 * Returns a single setting by key.
 * Access: admin
 */
router.get(
  "/:key",
  roles(["admin"]),
  settingsController.getSettingByKey
);

/**
 * PUT /api/settings
 * Updates multiple settings at once.
 * Body: { key: value, key: value, ... }
 * Access: admin
 */
router.put(
  "/",
  roles(["admin"]),
  settingsController.updateSettings
);

/**
 * PUT /api/settings/:key/reset
 * Resets a single setting to its default value.
 * Access: admin
 */
router.put(
  "/:key/reset",
  roles(["admin"]),
  settingsController.resetSetting
);

module.exports = router;
