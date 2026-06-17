/**
 * api/routes/dashboard.js
 * Savings Dashboard Routes
 *
 * Aggregates key metrics for the dashboard frontend:
 *   GET /api/dashboard/summary     — headline KPIs
 *   GET /api/dashboard/savings     — savings trend (monthly)
 *   GET /api/dashboard/loans       — active loan overview
 *   GET /api/dashboard/interest    — interest accrued this period
 *   GET /api/dashboard/members     — member activity snapshot
 *   GET /api/dashboard/transactions — recent transactions
 */

const express = require("express");
const router = express.Router();

const dashboardController = require("../controllers/dashboardController");
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");

// ─── Apply auth to all dashboard routes ───────────────────────────────────────
router.use(auth);

// ─── Summary KPIs ─────────────────────────────────────────────────────────────
/**
 * GET /api/dashboard/summary
 * Returns headline metrics:
 *   - totalSavings, totalLoans, totalMembers,
 *     interestEarned, pendingLoans, activeLoans
 * Access: all authenticated roles
 */
router.get("/summary", dashboardController.getSummary);

// ─── Savings Trend ────────────────────────────────────────────────────────────
/**
 * GET /api/dashboard/savings
 * Query params:
 *   period   — "monthly" | "quarterly" | "yearly"  (default: monthly)
 *   year     — YYYY (default: current year)
 * Returns monthly deposit/withdrawal breakdown
 * Access: all authenticated roles
 */
router.get("/savings", dashboardController.getSavingsTrend);

// ─── Loan Overview ────────────────────────────────────────────────────────────
/**
 * GET /api/dashboard/loans
 * Returns active/pending/closed loan counts and total disbursed
 * Access: all authenticated roles
 */
router.get("/loans", dashboardController.getLoanOverview);

// ─── Interest Summary ─────────────────────────────────────────────────────────
/**
 * GET /api/dashboard/interest
 * Query params:
 *   period — "this_month" | "last_month" | "ytd"  (default: this_month)
 * Returns interest earned, projected, and paid out
 * Access: admin, treasurer
 */
router.get(
  "/interest",
  roles(["admin", "treasurer"]),
  dashboardController.getInterestSummary
);

// ─── Member Activity ──────────────────────────────────────────────────────────
/**
 * GET /api/dashboard/members
 * Returns new members this month, active vs inactive counts,
 * top savers, and members with overdue loans
 * Access: admin, secretary
 */
router.get(
  "/members",
  roles(["admin", "secretary"]),
  dashboardController.getMemberActivity
);

// ─── Recent Transactions ──────────────────────────────────────────────────────
/**
 * GET /api/dashboard/transactions
 * Query params:
 *   limit  — number of records (default: 10, max: 50)
 *   type   — "deposit" | "withdrawal" | "loan_repayment" | "all"
 * Returns the most recent transactions across all members
 * Access: admin, treasurer, secretary
 */
router.get(
  "/transactions",
  roles(["admin", "treasurer", "secretary"]),
  dashboardController.getRecentTransactions
);

module.exports = router;



