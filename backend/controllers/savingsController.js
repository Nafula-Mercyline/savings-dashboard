/**
 * api/controllers/savingsController.js
 *
 * Thin HTTP layer — reads req, calls savingsService, sends JSON.
 * No business logic lives here.
 */

const savingsService = require("../services/savingsService");

// ─── GET /api/savings ──────────────────────────────────────────────────────────
exports.getAllSavings = async (req, res, next) => {
  try {
    const { status = "active", page = 1, limit = 20, search = "" } = req.query;
    const data = await savingsService.getAllSavings({
      status,
      page:   parseInt(page),
      limit:  Math.min(parseInt(limit), 100),
      search,
    });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/savings/:id ─────────────────────────────────────────────────────
exports.getSavingById = async (req, res, next) => {
  try {
    const data = await savingsService.getSavingById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Saving account not found" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/savings ────────────────────────────────────────────────────────
exports.createSaving = async (req, res, next) => {
  try {
    const data = await savingsService.createSaving(req.body);
    res.status(201).json({ success: true, message: "Saving account opened successfully", data });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/savings/:id ─────────────────────────────────────────────────────
exports.updateSaving = async (req, res, next) => {
  try {
    const data = await savingsService.updateSaving(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: "Saving account not found" });
    res.json({ success: true, message: "Saving account updated", data });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/savings/:id ──────────────────────────────────────────────────
exports.deleteSaving = async (req, res, next) => {
  try {
    await savingsService.deleteSaving(req.params.id);
    res.json({ success: true, message: "Saving account closed successfully" });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/savings/:id/deposit ───────────────────────────────────────────
exports.deposit = async (req, res, next) => {
  try {
    const data = await savingsService.deposit(req.params.id, req.body);
    res.status(201).json({ success: true, message: "Deposit recorded successfully", data });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/savings/:id/withdraw ──────────────────────────────────────────
exports.withdraw = async (req, res, next) => {
  try {
    const data = await savingsService.withdraw(req.params.id, req.body);
    res.status(201).json({ success: true, message: "Withdrawal recorded successfully", data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/savings/:id/transactions ───────────────────────────────────────
exports.getTransactions = async (req, res, next) => {
  try {
    const { type = "all", from, to, page = 1, limit = 20 } = req.query;
    const data = await savingsService.getTransactions(req.params.id, {
      type,
      from,
      to,
      page:  parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/savings/:id/statement ──────────────────────────────────────────
exports.getStatement = async (req, res, next) => {
  try {
    const now = new Date();
    const {
      from   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
      to     = now.toISOString().split("T")[0],
      format = "json",
    } = req.query;

    const data = await savingsService.getStatement(req.params.id, { from, to });

    if (format === "pdf") {
      // Hand off to a PDF generator (e.g. puppeteer / pdfkit)
      // For now return JSON — wire up your PDF service here
      return res.json({ success: true, message: "PDF generation coming soon", data });
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/savings/member/:memberId ───────────────────────────────────────
exports.getSavingsByMember = async (req, res, next) => {
  try {
    const data = await savingsService.getSavingsByMember(req.params.memberId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};



