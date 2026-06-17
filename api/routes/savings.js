/**
 * api/routes/savings.js
 * Savings Routes
 *
 * Base URL: /api/savings
 *
 *   GET    /api/savings                  — list all savings accounts
 *   GET    /api/savings/:id              — get a single saving account
 *   POST   /api/savings                  — open a new saving account
 *   PUT    /api/savings/:id              — update saving account details
 *   DELETE /api/savings/:id              — close / deactivate saving account
 *
 *   POST   /api/savings/:id/deposit      — make a deposit
 *   POST   /api/savings/:id/withdraw     — make a withdrawal
 *   GET    /api/savings/:id/transactions — transaction history for an account
 *   GET    /api/savings/:id/statement    — downloadable statement (PDF-ready)
 *   GET    /api/savings/member/:memberId — all savings for a specific member
 */

const express = require("express");
const router  = express.Router();

const savingsController = require("../controllers/savingsController");
const auth              = require("../middleware/auth");
const roles             = require("../middleware/roles");
const validate          = require("../middleware/validate");
const {
  createSavingSchema,
  updateSavingSchema,
  depositSchema,
  withdrawSchema,
} = require("../validators/savingsValidator");

// ─── Apply auth to all savings routes ─────────────────────────────────────────
router.use(auth);

// ─── Account Management ───────────────────────────────────────────────────────

/**
 * GET /api/savings
 * Query params:
 *   status   — "active" | "inactive" | "closed" | "all"  (default: active)
 *   page     — page number  (default: 1)
 *   limit    — records per page (default: 20, max: 100)
 *   search   — search by member name or account number
 * Access: admin, treasurer, secretary
 */
router.get(
  "/",
  roles(["admin", "treasurer", "secretary"]),
  savingsController.getAllSavings
);

/**
 * GET /api/savings/:id
 * Returns a single saving account with its current balance and member info.
 * Access: admin, treasurer, secretary, or the account owner (member)
 */
router.get("/:id", savingsController.getSavingById);

/**
 * POST /api/savings
 * Opens a new saving account for a member.
 * Body: { memberId, accountType, initialDeposit, interestRate }
 * Access: admin, treasurer
 */
router.post(
  "/",
  roles(["admin", "treasurer"]),
  validate(createSavingSchema),
  savingsController.createSaving
);

/**
 * PUT /api/savings/:id
 * Updates account details (interest rate, account type, status).
 * Body: { interestRate?, accountType?, status? }
 * Access: admin only
 */
router.put(
  "/:id",
  roles(["admin"]),
  validate(updateSavingSchema),
  savingsController.updateSaving
);

/**
 * DELETE /api/savings/:id
 * Closes / deactivates a saving account.
 * Only allowed if balance is zero.
 * Access: admin only
 */
router.delete(
  "/:id",
  roles(["admin"]),
  savingsController.deleteSaving
);

// ─── Deposits & Withdrawals ───────────────────────────────────────────────────

/**
 * POST /api/savings/:id/deposit
 * Records a deposit into a saving account.
 * Body: { amount, paymentMethod, reference?, notes? }
 * Access: admin, treasurer
 */
router.post(
  "/:id/deposit",
  roles(["admin", "treasurer"]),
  validate(depositSchema),
  savingsController.deposit
);

/**
 * POST /api/savings/:id/withdraw
 * Records a withdrawal from a saving account.
 * Body: { amount, paymentMethod, reference?, notes? }
 * Rejects if amount > available balance.
 * Access: admin, treasurer
 */
router.post(
  "/:id/withdraw",
  roles(["admin", "treasurer"]),
  validate(withdrawSchema),
  savingsController.withdraw
);

// ─── History & Statements ─────────────────────────────────────────────────────

/**
 * GET /api/savings/:id/transactions
 * Returns paginated transaction history for a specific saving account.
 * Query params:
 *   type     — "deposit" | "withdrawal" | "all"  (default: all)
 *   from     — start date  YYYY-MM-DD
 *   to       — end date    YYYY-MM-DD
 *   page     — default 1
 *   limit    — default 20
 * Access: admin, treasurer, secretary
 */
router.get(
  "/:id/transactions",
  roles(["admin", "treasurer", "secretary"]),
  savingsController.getTransactions
);

/**
 * GET /api/savings/:id/statement
 * Returns a full account statement for a date range.
 * Query params:
 *   from  — YYYY-MM-DD  (default: first day of current month)
 *   to    — YYYY-MM-DD  (default: today)
 *   format — "json" | "pdf"  (default: json)
 * Access: admin, treasurer
 */
router.get(
  "/:id/statement",
  roles(["admin", "treasurer"]),
  savingsController.getStatement
);

// ─── Member-scoped Lookup ─────────────────────────────────────────────────────

/**
 * GET /api/savings/member/:memberId
 * Returns all saving accounts belonging to a specific member.
 * Access: admin, treasurer, secretary
 */
router.get(
  "/member/:memberId",
  roles(["admin", "treasurer", "secretary"]),
  savingsController.getSavingsByMember
);

module.exports = router;



