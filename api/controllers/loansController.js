/**
 * api/controllers/loansController.js
 *
 * Thin HTTP layer — reads req, calls loansService, sends JSON.
 * No business logic lives here.
 */

const loansService = require("../services/loansService");

// ─── GET /api/loans ───────────────────────────────────────────────────────────
exports.getAllLoans = async (req, res, next) => {
    try {
        const { status = "all", page = 1, limit = 20, search = "" } = req.query;
        const data = await loansService.getAllLoans({
            status,
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100),
            search,
        });
        res.json({ success: true, ...data });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/loans/:id ───────────────────────────────────────────────────────
exports.getLoanById = async (req, res, next) => {
    try {
        const data = await loansService.getLoanById(req.params.id);
        if (!data) return res.status(404).json({ success: false, message: "Loan not found" });
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/loans ──────────────────────────────────────────────────────────
exports.createLoan = async (req, res, next) => {
    try {
        const data = await loansService.createLoan(req.body);
        res.status(201).json({ success: true, message: "Loan application submitted successfully", data });
    } catch (err) {
        next(err);
    }
};

// ─── PUT /api/loans/:id ───────────────────────────────────────────────────────
exports.updateLoan = async (req, res, next) => {
    try {
        const data = await loansService.updateLoan(req.params.id, req.body);
        if (!data) return res.status(404).json({ success: false, message: "Loan not found" });
        res.json({ success: true, message: "Loan updated successfully", data });
    } catch (err) {
        next(err);
    }
};

// ─── DELETE /api/loans/:id ────────────────────────────────────────────────────
exports.deleteLoan = async (req, res, next) => {
    try {
        await loansService.deleteLoan(req.params.id);
        res.json({ success: true, message: "Loan application cancelled successfully" });
    } catch (err) {
        next(err);
    }
};

// ─── PUT /api/loans/:id/approve ───────────────────────────────────────────────
exports.approveLoan = async (req, res, next) => {
    try {
        const data = await loansService.approveLoan(req.params.id, req.body);
        res.json({ success: true, message: "Loan approved successfully", data });
    } catch (err) {
        next(err);
    }
};

// ─── PUT /api/loans/:id/reject ────────────────────────────────────────────────
exports.rejectLoan = async (req, res, next) => {
    try {
        const data = await loansService.rejectLoan(req.params.id, req.body);
        res.json({ success: true, message: "Loan application rejected", data });
    } catch (err) {
        next(err);
    }
};

// ─── PUT /api/loans/:id/disburse ──────────────────────────────────────────────
exports.disburseLoan = async (req, res, next) => {
    try {
        const data = await loansService.disburseLoan(req.params.id, req.body);
        res.json({ success: true, message: "Loan disbursed successfully", data });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/loans/:id/repayment ────────────────────────────────────────────
exports.recordRepayment = async (req, res, next) => {
    try {
        const data = await loansService.recordRepayment(req.params.id, req.body);
        res.status(201).json({ success: true, message: "Repayment recorded successfully", data });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/loans/:id/repayments ────────────────────────────────────────────
exports.getRepayments = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const data = await loansService.getRepayments(req.params.id, {
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100),
        });
        res.json({ success: true, ...data });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/loans/:id/schedule ─────────────────────────────────────────────
exports.getRepaymentSchedule = async (req, res, next) => {
    try {
        const data = await loansService.getRepaymentSchedule(req.params.id);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/loans/:id/statement ────────────────────────────────────────────
exports.getLoanStatement = async (req, res, next) => {
    try {
        const { from, to, format = "json" } = req.query;
        const data = await loansService.getLoanStatement(req.params.id, { from, to });

        if (format === "pdf") {
            return res.json({ success: true, message: "PDF generation coming soon", data });
        }

        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/loans/member/:memberId ─────────────────────────────────────────
exports.getLoansByMember = async (req, res, next) => {
    try {
        const data = await loansService.getLoansByMember(req.params.memberId);
        res.json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/loans/overdue ───────────────────────────────────────────────────
exports.getOverdueLoans = async (req, res, next) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const data = await loansService.getOverdueLoans({
            page: parseInt(page),
            limit: Math.min(parseInt(limit), 100),
        });
        res.json({ success: true, ...data });
    } catch (err) {
        next(err);
    }
};



