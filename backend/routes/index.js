/**
 * api/routes/index.js
 * Central route registry
 *
 * Import this single file in app.js:
 *   app.use("/api", require("./routes/index"));
 */

const express = require("express");
const router  = express.Router();

// ─── Route Modules ─────────────────────────────────────────────────────────────
router.use("/dashboard",    require("./dashboard"));
router.use("/savings",      require("./savings"));
router.use("/loans",        require("./loans"));
router.use("/interest",     require("./interest"));
router.use("/summary",      require("./summary"));
router.use("/members",      require("./members"));
router.use("/transactions", require("./transactions"));
router.use("/reports",      require("./reports"));
router.use("/settings",     require("./settings"));

module.exports = router;



