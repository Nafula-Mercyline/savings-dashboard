/**
 * api/routes/transactions.js
 * Transactions Routes
 *
 * Base URL: /api/transactions
 *
 *   GET    /api/transactions                        — list all transactions
 *   GET    /api/transactions/:id                    — get a single transaction
 *   POST   /api/transactions                        — create a manual transaction
 *   DELETE /api/transactions/:id                    — reverse a transaction
 *
 *   GET    /api/transactions/summary                — transaction totals by type & period
 *   GET    /api/transactions/export                 — export transactions (CSV/Excel)
 *   GET    /api/transactions/recent                 — latest N transactions (dashboard feed)
 *
 *   GET    /api/transactions/member/:memberId        — all transactions for a member
 *   GET    /api/transactions/saving/:savingId        — all transactions for a saving account
 *   GET    /api/transactions/loan/:loanId            — all transactions for a loan
 */

const express = require("express");
const router  = express.Router();

const transactionsController = require("../controllers/transactionsController");
const auth                   = require("../middleware/auth");
const roles                  = require("../middleware/roles");
const validate               = require("../middleware/validate");
const {
  createTransactionSchema,
} = require("../validators/transactionsValidator");

// ─── Apply auth to all transaction routes ─────────────────────────────────────
router.use(auth);

// ─── NOTE: static paths must come before /:id ─────────────────────────────────

// ─── Aggregates & Utilities ───────────────────────────────────────────────────

/**
 * GET /api/transactions/summary
 * Returns totals grouped by type for a given period.
 * Query params:
 *   period — "today" | "this_week" | "this_month" | "last_month" | "ytd" | "custom"
 *   from   — YYYY-MM-DD (required when period=custom)
 *   to     — YYYY-MM-DD (required when period=custom)
 * Access: admin, treasurer
 */
router.get(
  "/summary",
  roles(["admin", "treasurer"]),
  transactionsController.getSummary
);

/**
 * GET /api/transactions/export
 * Exports transactions as CSV or Excel for a date range.
 * Query params:
 *   from   — YYYY-MM-DD  (default: first day of current month)
 *   to     — YYYY-MM-DD  (default: today)
 *   type   — "deposit" | "withdrawal" | "loan_repayment" | "all"  (default: all)
 *   format — "csv" | "excel"  (default: csv)
 * Access: admin, treasurer
 */
router.get(
  "/export",
  roles(["admin", "treasurer"]),
  transactionsController.exportTransactions
);

/**
 * GET /api/transactions/recent
 * Returns the latest N transactions — used for the dashboard feed.
 * Query params:
 *   limit — default 10, max 50
 *   type  — "deposit" | "withdrawal" | "loan_repayment" | "all"  (default: all)
 * Access: admin, treasurer, secretary
 */
router.get(
  "/recent",
  roles(["admin", "treasurer", "secretary"]),
  transactionsController.getRecent
);

// ─── Scoped Lookups ───────────────────────────────────────────────────────────

/**
 * GET /api/transactions/member/:memberId
 * All transactions for a specific member, paginated and filterable.
 * Query params:
 *   type  — "deposit" | "withdrawal" | "loan_repayment" | "all"  (default: all)
 *   from  — YYYY-MM-DD
 *   to    — YYYY-MM-DD
 *   page  — default 1
 *   limit — default 20
 * Access: admin, treasurer, secretary
 */
router.get(
  "/member/:memberId",
  roles(["admin", "treasurer", "secretary"]),
  transactionsController.getByMember
);

/**
 * GET /api/transactions/saving/:savingId
 * All transactions for a specific saving account.
 * Query params:
 *   type  — "deposit" | "withdrawal" | "all"  (default: all)
 *   from  — YYYY-MM-DD
 *   to    — YYYY-MM-DD
 *   page  — default 1
 *   limit — default 20
 * Access: admin, treasurer, secretary
 */
router.get(
  "/saving/:savingId",
  roles(["admin", "treasurer", "secretary"]),
  transactionsController.getBySaving
);

/**
 * GET /api/transactions/loan/:loanId
 * All transactions for a specific loan.
 * Query params:
 *   page  — default 1
 *   limit — default 20
 * Access: admin, treasurer, secretary
 */
router.get(
  "/loan/:loanId",
  roles(["admin", "treasurer", "secretary"]),
  transactionsController.getByLoan
);

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * GET /api/transactions
 * List all transactions, paginated and filterable.
 * Query params:
 *   type    — "deposit" | "withdrawal" | "loan_repayment" |
 *             "loan_disbursement" | "interest_credit" | "reversal" | "all"
 *   status  — "completed" | "reversed" | "pending" | "all"  (default: all)
 *   from    — YYYY-MM-DD
 *   to      — YYYY-MM-DD
 *   page    — default 1
 *   limit   — default 20
 *   search  — member name or transaction reference
 * Access: admin, treasurer, secretary
 */
router.get(
  "/",
  roles(["admin", "treasurer", "secretary"]),
  transactionsController.getAllTransactions
);

/**
 * GET /api/transactions/:id
 * Returns a single transaction with full member and account details.
 * Access: admin, treasurer, secretary
 */
router.get(
  "/:id",
  roles(["admin", "treasurer", "secretary"]),
  transactionsController.getTransactionById
);

/**
 * POST /api/transactions
 * Manually creates a transaction (adjustments / corrections).
 * Body: {
 *   memberId, type, amount, savingId?, loanId?,
 *   paymentMethod?, reference?, description?
 * }
 * Access: admin only
 */
router.post(
  "/",
  roles(["admin"]),
  validate(createTransactionSchema),
  transactionsController.createTransaction
);

/**
 * DELETE /api/transactions/:id
 * Reverses a transaction.
 * Creates a compensating entry and marks the original as "reversed".
 * Body: { reason }
 * Blocked for loan_disbursement and already-reversed transactions.
 * Access: admin only
 */
router.delete(
  "/:id",
  roles(["admin"]),
  transactionsController.reverseTransaction
);

module.exports = router;



