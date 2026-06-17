/**
 * api/routes/reports.js
 * Reports Routes
 *
 * Base URL: /api/reports
 *
 *   GET    /api/reports/financial         — full financial report (P&L style)
 *   GET    /api/reports/savings           — savings performance report
 *   GET    /api/reports/loans             — loan portfolio report
 *   GET    /api/reports/interest          — interest income & expense report
 *   GET    /api/reports/members           — membership growth & activity report
 *   GET    /api/reports/transactions      — transaction volume & trend report
 *   GET    /api/reports/arrears           — overdue loans & arrears aging report
 *   GET    /api/reports/balance-sheet     — assets vs liabilities snapshot
 *   GET    /api/reports/cashflow          — cash flow statement
 *
 *   GET    /api/reports/export            — export any report as PDF / CSV / Excel
 *   GET    /api/reports/scheduled         — list scheduled reports
 *   POST   /api/reports/scheduled         — create a scheduled report
 *   DELETE /api/reports/scheduled/:id     — delete a scheduled report
 */

const express = require("express");
const router  = express.Router();

const reportsController = require("../controllers/reportsController");
const auth              = require("../middleware/auth");
const roles             = require("../middleware/roles");
const validate          = require("../middleware/validate");
const {
  scheduleReportSchema,
} = require("../validators/reportsValidator");

// ─── Apply auth to all report routes ──────────────────────────────────────────
router.use(auth);

// ─── NOTE: static paths must come before any dynamic segments ─────────────────

// ─── Core Reports ─────────────────────────────────────────────────────────────

/**
 * GET /api/reports/financial
 * Full financial summary — income, expenses, net surplus/deficit.
 * Query params:
 *   period — "this_month"|"last_month"|"this_quarter"|"last_quarter"|"ytd"|"custom"
 *   from   — YYYY-MM-DD (required when period=custom)
 *   to     — YYYY-MM-DD (required when period=custom)
 * Access: admin, treasurer
 */
router.get(
  "/financial",
  roles(["admin", "treasurer"]),
  reportsController.getFinancialReport
);

/**
 * GET /api/reports/savings
 * Savings portfolio: total balances, growth rate, top accounts,
 * deposit vs withdrawal trends, account type breakdown.
 * Query params: period, from, to
 * Access: admin, treasurer
 */
router.get(
  "/savings",
  roles(["admin", "treasurer"]),
  reportsController.getSavingsReport
);

/**
 * GET /api/reports/loans
 * Loan portfolio: disbursements, collections, default rate,
 * status breakdown, top borrowers.
 * Query params: period, from, to
 * Access: admin, treasurer
 */
router.get(
  "/loans",
  roles(["admin", "treasurer"]),
  reportsController.getLoansReport
);

/**
 * GET /api/reports/interest
 * Interest income & expense: earned on savings, charged on loans,
 * paid out, net interest margin.
 * Query params: period, from, to
 * Access: admin, treasurer
 */
router.get(
  "/interest",
  roles(["admin", "treasurer"]),
  reportsController.getInterestReport
);

/**
 * GET /api/reports/members
 * Membership report: growth trend, active/inactive breakdown,
 * retention rate, new joins.
 * Query params: period, from, to
 * Access: admin, treasurer, secretary
 */
router.get(
  "/members",
  roles(["admin", "treasurer", "secretary"]),
  reportsController.getMembersReport
);

/**
 * GET /api/reports/transactions
 * Transaction volume & value trends by type over a period.
 * Query params:
 *   period  — as above
 *   from, to
 *   groupBy — "day" | "week" | "month"  (default: day)
 * Access: admin, treasurer
 */
router.get(
  "/transactions",
  roles(["admin", "treasurer"]),
  reportsController.getTransactionsReport
);

/**
 * GET /api/reports/arrears
 * Overdue loans aging report — buckets: 1-30, 31-60, 61-90, 90+ days.
 * Query params:
 *   agingBucket — "30"|"60"|"90"|"90plus"|"all"  (default: all)
 * Access: admin, treasurer
 */
router.get(
  "/arrears",
  roles(["admin", "treasurer"]),
  reportsController.getArrearsReport
);

/**
 * GET /api/reports/balance-sheet
 * Point-in-time balance sheet: assets, liabilities, equity.
 * Query params:
 *   asAt — YYYY-MM-DD  (default: today)
 * Access: admin, treasurer
 */
router.get(
  "/balance-sheet",
  roles(["admin", "treasurer"]),
  reportsController.getBalanceSheet
);

/**
 * GET /api/reports/cashflow
 * Cash flow statement: operating and financing activities.
 * Query params: period, from, to
 * Access: admin, treasurer
 */
router.get(
  "/cashflow",
  roles(["admin", "treasurer"]),
  reportsController.getCashFlowReport
);

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * GET /api/reports/export
 * Generates and downloads any report in the requested format.
 * Query params:
 *   report  — "financial"|"savings"|"loans"|"interest"|
 *             "members"|"transactions"|"arrears"|"cashflow"
 *   format  — "pdf"|"csv"|"excel"  (default: csv)
 *   period, from, to  — same as individual report
 * Access: admin, treasurer
 */
router.get(
  "/export",
  roles(["admin", "treasurer"]),
  reportsController.exportReport
);

// ─── Scheduled Reports ────────────────────────────────────────────────────────

/**
 * GET /api/reports/scheduled
 * Lists all scheduled / auto-generated report configurations.
 * Access: admin only
 */
router.get(
  "/scheduled",
  roles(["admin"]),
  reportsController.getScheduledReports
);

/**
 * POST /api/reports/scheduled
 * Creates a new scheduled report configuration.
 * Body: {
 *   reportType, frequency ("daily"|"weekly"|"monthly"),
 *   format, recipients (email[]), dayOfMonth?
 * }
 * Access: admin only
 */
router.post(
  "/scheduled",
  roles(["admin"]),
  validate(scheduleReportSchema),
  reportsController.createScheduledReport
);

/**
 * DELETE /api/reports/scheduled/:id
 * Removes a scheduled report configuration.
 * Access: admin only
 */
router.delete(
  "/scheduled/:id",
  roles(["admin"]),
  reportsController.deleteScheduledReport
);

module.exports = router;



