/**
 * api/routes/loans.js
 * Loans Routes
 *
 * Base URL: /api/loans
 *
 *   GET    /api/loans                        — list all loans
 *   GET    /api/loans/:id                    — get a single loan
 *   POST   /api/loans                        — apply for a new loan
 *   PUT    /api/loans/:id                    — update loan details
 *   DELETE /api/loans/:id                    — cancel a pending loan
 *
 *   PUT    /api/loans/:id/approve            — approve a loan application
 *   PUT    /api/loans/:id/reject             — reject a loan application
 *   PUT    /api/loans/:id/disburse           — mark loan as disbursed
 *
 *   POST   /api/loans/:id/repayment          — record a repayment
 *   GET    /api/loans/:id/repayments         — repayment history for a loan
 *   GET    /api/loans/:id/schedule           — full repayment schedule
 *   GET    /api/loans/:id/statement          — loan statement for a period
 *
 *   GET    /api/loans/member/:memberId       — all loans for a member
 *   GET    /api/loans/overdue                — all overdue loans
 */

const express = require("express");
const router  = express.Router();

const loansController = require("../controllers/loansController");
const auth            = require("../middleware/auth");
const roles           = require("../middleware/roles");
const validate        = require("../middleware/validate");
const {
  createLoanSchema,
  updateLoanSchema,
  repaymentSchema,
  approveSchema,
  rejectSchema,
} = require("../validators/loansValidator");

// ─── Apply auth to all loan routes ────────────────────────────────────────────
router.use(auth);

// ─── NOTE: static path /overdue must come before /:id ─────────────────────────

// ─── Overdue Loans ────────────────────────────────────────────────────────────
/**
 * GET /api/loans/overdue
 * Returns all active loans past their due date.
 * Query params:
 *   page  — default 1
 *   limit — default 20
 * Access: admin, treasurer
 */
router.get(
  "/overdue",
  roles(["admin", "treasurer"]),
  loansController.getOverdueLoans
);

// ─── Member-scoped Lookup ─────────────────────────────────────────────────────
/**
 * GET /api/loans/member/:memberId
 * Returns all loans belonging to a specific member.
 * Access: admin, treasurer, secretary
 */
router.get(
  "/member/:memberId",
  roles(["admin", "treasurer", "secretary"]),
  loansController.getLoansByMember
);

// ─── Loan CRUD ────────────────────────────────────────────────────────────────

/**
 * GET /api/loans
 * Query params:
 *   status  — "pending" | "active" | "closed" | "rejected" | "defaulted" | "all"
 *   page    — default 1
 *   limit   — default 20
 *   search  — member name or loan reference
 * Access: admin, treasurer, secretary
 */
router.get(
  "/",
  roles(["admin", "treasurer", "secretary"]),
  loansController.getAllLoans
);

/**
 * GET /api/loans/:id
 * Returns a single loan with member info and repayment summary.
 * Access: admin, treasurer, secretary
 */
router.get(
  "/:id",
  roles(["admin", "treasurer", "secretary"]),
  loansController.getLoanById
);

/**
 * POST /api/loans
 * Submits a new loan application.
 * Body: { memberId, principal, interestRate, termMonths, loanType, purpose? }
 * Access: admin, treasurer, secretary
 */
router.post(
  "/",
  roles(["admin", "treasurer", "secretary"]),
  validate(createLoanSchema),
  loansController.createLoan
);

/**
 * PUT /api/loans/:id
 * Updates a loan that is still in "pending" status.
 * Body: { principal?, interestRate?, termMonths?, purpose? }
 * Access: admin only
 */
router.put(
  "/:id",
  roles(["admin"]),
  validate(updateLoanSchema),
  loansController.updateLoan
);

/**
 * DELETE /api/loans/:id
 * Cancels a loan application — only allowed while status is "pending".
 * Access: admin only
 */
router.delete(
  "/:id",
  roles(["admin"]),
  loansController.deleteLoan
);

// ─── Approval Workflow ────────────────────────────────────────────────────────

/**
 * PUT /api/loans/:id/approve
 * Approves a pending loan application.
 * Body: { notes? }
 * Access: admin only
 */
router.put(
  "/:id/approve",
  roles(["admin"]),
  validate(approveSchema),
  loansController.approveLoan
);

/**
 * PUT /api/loans/:id/reject
 * Rejects a pending loan application.
 * Body: { reason }
 * Access: admin only
 */
router.put(
  "/:id/reject",
  roles(["admin"]),
  validate(rejectSchema),
  loansController.rejectLoan
);

/**
 * PUT /api/loans/:id/disburse
 * Marks an approved loan as disbursed and sets the start date.
 * Body: { disbursedAt?, notes? }
 * Access: admin, treasurer
 */
router.put(
  "/:id/disburse",
  roles(["admin", "treasurer"]),
  loansController.disburseLoan
);

// ─── Repayments ───────────────────────────────────────────────────────────────

/**
 * POST /api/loans/:id/repayment
 * Records a repayment against a loan.
 * Body: { amount, paymentMethod, reference?, notes? }
 * Access: admin, treasurer
 */
router.post(
  "/:id/repayment",
  roles(["admin", "treasurer"]),
  validate(repaymentSchema),
  loansController.recordRepayment
);

/**
 * GET /api/loans/:id/repayments
 * Returns all repayment records for a loan.
 * Query params:
 *   page  — default 1
 *   limit — default 20
 * Access: admin, treasurer, secretary
 */
router.get(
  "/:id/repayments",
  roles(["admin", "treasurer", "secretary"]),
  loansController.getRepayments
);

/**
 * GET /api/loans/:id/schedule
 * Returns the full amortised repayment schedule.
 * Access: admin, treasurer, secretary
 */
router.get(
  "/:id/schedule",
  roles(["admin", "treasurer", "secretary"]),
  loansController.getRepaymentSchedule
);

/**
 * GET /api/loans/:id/statement
 * Returns a loan statement for a date range.
 * Query params:
 *   from   — YYYY-MM-DD (default: loan start date)
 *   to     — YYYY-MM-DD (default: today)
 *   format — "json" | "pdf"  (default: json)
 * Access: admin, treasurer
 */
router.get(
  "/:id/statement",
  roles(["admin", "treasurer"]),
  loansController.getLoanStatement
);

module.exports = router;



