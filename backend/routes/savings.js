/**
 * api/routes/savings.js
 * Savings Routes
 * Base URL: /api/savings
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

// ─── Apply auth to ALL routes FIRST ───────────────────────────────────────────
router.use(auth);

// ─── NOTE: Static paths must come BEFORE /:id ─────────────────────────────────

// ─── Member-scoped Lookup ─────────────────────────────────────────────────────
/**
 * GET /api/savings/member/:memberId
 * All saving accounts for a specific member.
 * Access: admin, treasurer, secretary
 */
router.get(
  "/member/:memberId",
  roles(["admin", "treasurer", "secretary"]),
  savingsController.getSavingsByMember
);

// ─── Account List ─────────────────────────────────────────────────────────────
/**
 * GET /api/savings
 * Query params: status, page, limit, search
 * Access: admin, treasurer, secretary
 */
router.get(
  "/",
  roles(["admin", "treasurer", "secretary"]),
  savingsController.getAllSavings
);

// ─── Single Account ───────────────────────────────────────────────────────────
/**
 * GET /api/savings/:id
 * Access: admin, treasurer, secretary
 */
router.get(
  "/:id",
  roles(["admin", "treasurer", "secretary"]),
  savingsController.getSavingById
);

// ─── Create Account ───────────────────────────────────────────────────────────
/**
 * POST /api/savings
 * Body: { memberId, accountType, initialDeposit, interestRate }
 * Access: admin, treasurer
 */
router.post(
  "/",
  roles(["admin", "treasurer"]),
  validate(createSavingSchema),
  savingsController.createSaving
);

// ─── Update Account ───────────────────────────────────────────────────────────
/**
 * PUT /api/savings/:id
 * Body: { interestRate?, accountType?, status? }
 * Access: admin only
 */
router.put(
  "/:id",
  roles(["admin"]),
  validate(updateSavingSchema),
  savingsController.updateSaving
);

// ─── Close Account ────────────────────────────────────────────────────────────
/**
 * DELETE /api/savings/:id
 * Only allowed if balance is zero.
 * Access: admin only
 */
router.delete(
  "/:id",
  roles(["admin"]),
  savingsController.deleteSaving
);

// ─── Deposit ──────────────────────────────────────────────────────────────────
/**
 * POST /api/savings/:id/deposit
 * Body: { amount, paymentMethod, reference?, notes? }
 * Access: admin, treasurer
 */
router.post(
  "/:id/deposit",
  roles(["admin", "treasurer"]),
  validate(depositSchema),
  savingsController.deposit
);

// ─── Withdraw ─────────────────────────────────────────────────────────────────
/**
 * POST /api/savings/:id/withdraw
 * Body: { amount, paymentMethod, reference?, notes? }
 * Access: admin, treasurer
 */
router.post(
  "/:id/withdraw",
  roles(["admin", "treasurer"]),
  validate(withdrawSchema),
  savingsController.withdraw
);

// ─── Transaction History ──────────────────────────────────────────────────────
/**
 * GET /api/savings/:id/transactions
 * Query params: type, from, to, page, limit
 * Access: admin, treasurer, secretary
 */
router.get(
  "/:id/transactions",
  roles(["admin", "treasurer", "secretary"]),
  savingsController.getTransactions
);

// ─── Statement ────────────────────────────────────────────────────────────────
/**
 * GET /api/savings/:id/statement
 * Query params: from, to, format
 * Access: admin, treasurer
 */
router.get(
  "/:id/statement",
  roles(["admin", "treasurer"]),
  savingsController.getStatement
);

module.exports = router;
