/**
 * api/routes/interest.js
 * Interest Routes
 *
 * Base URL: /api/interest
 *
 *   GET    /api/interest                        — list all interest records
 *   GET    /api/interest/:id                    — get a single interest record
 *   POST   /api/interest                        — manually create an interest record
 *   PUT    /api/interest/:id                    — update an interest record
 *   DELETE /api/interest/:id                    — delete an interest record
 *
 *   POST   /api/interest/calculate/savings      — calculate & post savings interest
 *   POST   /api/interest/calculate/loans        — calculate & post loan interest
 *   POST   /api/interest/calculate/all          — run full interest cycle (savings + loans)
 *
 *   GET    /api/interest/summary                — interest totals for a period
 *   GET    /api/interest/member/:memberId       — all interest records for a member
 *   GET    /api/interest/saving/:savingId       — interest history for a saving account
 *   GET    /api/interest/loan/:loanId           — interest history for a loan
 *   POST   /api/interest/payout                 — disburse earned interest to members
 */

const express = require("express");
const router  = express.Router();

const interestController = require("../controllers/interestController");
const auth               = require("../middleware/auth");
const roles              = require("../middleware/roles");
const validate           = require("../middleware/validate");
const {
  createInterestSchema,
  updateInterestSchema,
  calculateSavingsSchema,
  calculateLoansSchema,
  payoutSchema,
} = require("../validators/interestValidator");

// ─── Apply auth to all interest routes ────────────────────────────────────────
router.use(auth);

// ─── NOTE: static paths must come before /:id ─────────────────────────────────

// ─── Interest Calculations ────────────────────────────────────────────────────

/**
 * POST /api/interest/calculate/savings
 * Calculates and posts interest earned on all active saving accounts.
 * Body: { period?, asAt?, dryRun? }
 *   period — "monthly" | "quarterly" (default: monthly)
 *   asAt   — YYYY-MM-DD date to calculate as of (default: today)
 *   dryRun — true: preview without saving (default: false)
 * Access: admin, treasurer
 */
router.post(
  "/calculate/savings",
  roles(["admin", "treasurer"]),
  validate(calculateSavingsSchema),
  interestController.calculateSavingsInterest
);

/**
 * POST /api/interest/calculate/loans
 * Calculates and posts interest charged on all active loans.
 * Body: { period?, asAt?, dryRun? }
 * Access: admin, treasurer
 */
router.post(
  "/calculate/loans",
  roles(["admin", "treasurer"]),
  validate(calculateLoansSchema),
  interestController.calculateLoanInterest
);

/**
 * POST /api/interest/calculate/all
 * Runs the full end-of-period interest cycle:
 *   1. Calculate savings interest (earned)
 *   2. Calculate loan interest (charged)
 *   3. Returns a combined summary
 * Body: { period?, asAt?, dryRun? }
 * Access: admin only
 */
router.post(
  "/calculate/all",
  roles(["admin"]),
  interestController.calculateAll
);

/**
 * GET /api/interest/summary
 * Returns aggregated interest totals for a period.
 * Query params:
 *   period — "this_month" | "last_month" | "ytd" | "custom" (default: this_month)
 *   from   — YYYY-MM-DD (required when period=custom)
 *   to     — YYYY-MM-DD (required when period=custom)
 * Access: admin, treasurer
 */
router.get(
  "/summary",
  roles(["admin", "treasurer"]),
  interestController.getSummary
);

/**
 * POST /api/interest/payout
 * Disburses earned interest to members' saving accounts.
 * Body: { period, memberIds? }
 *   memberIds — optional array to pay specific members only
 * Access: admin only
 */
router.post(
  "/payout",
  roles(["admin"]),
  validate(payoutSchema),
  interestController.processPayout
);

// ─── Scoped Lookups ───────────────────────────────────────────────────────────

/**
 * GET /api/interest/member/:memberId
 * All interest records for a specific member.
 * Query params:
 *   type  — "earned" | "charged" | "paid" | "all" (default: all)
 *   page  — default 1
 *   limit — default 20
 * Access: admin, treasurer
 */
router.get(
  "/member/:memberId",
  roles(["admin", "treasurer"]),
  interestController.getByMember
);

/**
 * GET /api/interest/saving/:savingId
 * Interest history for a specific saving account.
 * Query params:
 *   page  — default 1
 *   limit — default 20
 * Access: admin, treasurer
 */
router.get(
  "/saving/:savingId",
  roles(["admin", "treasurer"]),
  interestController.getBySaving
);

/**
 * GET /api/interest/loan/:loanId
 * Interest history for a specific loan.
 * Query params:
 *   page  — default 1
 *   limit — default 20
 * Access: admin, treasurer
 */
router.get(
  "/loan/:loanId",
  roles(["admin", "treasurer"]),
  interestController.getByLoan
);

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/interest
 * List all interest records, paginated and filterable.
 * Query params:
 *   type   — "earned" | "charged" | "paid" | "all" (default: all)
 *   period — "this_month" | "last_month" | "ytd" | "all" (default: all)
 *   page   — default 1
 *   limit  — default 20
 * Access: admin, treasurer
 */
router.get(
  "/",
  roles(["admin", "treasurer"]),
  interestController.getAllInterest
);

/**
 * GET /api/interest/:id
 * Returns a single interest record with member and account details.
 * Access: admin, treasurer
 */
router.get(
  "/:id",
  roles(["admin", "treasurer"]),
  interestController.getInterestById
);

/**
 * POST /api/interest
 * Manually creates an interest record (adjustments/corrections).
 * Body: { memberId, type, amount, savingId?, loanId?, notes?, period? }
 * Access: admin only
 */
router.post(
  "/",
  roles(["admin"]),
  validate(createInterestSchema),
  interestController.createInterest
);

/**
 * PUT /api/interest/:id
 * Updates an interest record — amount or notes only.
 * Body: { amount?, notes? }
 * Access: admin only
 */
router.put(
  "/:id",
  roles(["admin"]),
  validate(updateInterestSchema),
  interestController.updateInterest
);

/**
 * DELETE /api/interest/:id
 * Deletes an interest record (reversals/corrections only).
 * Access: admin only
 */
router.delete(
  "/:id",
  roles(["admin"]),
  interestController.deleteInterest
);

module.exports = router;



