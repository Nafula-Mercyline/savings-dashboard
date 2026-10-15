/**
 * api/controllers/transactionsController.js
 *
 * Thin HTTP layer — reads req, calls transactionsService, sends JSON.
 * No business logic lives here.
 */

const transactionsService = require("../services/transactionsService");

// ─── GET /api/transactions ────────────────────────────────────────────────────
exports.getAllTransactions = async (req, res, next) => {
  try {
    const {
      type   = "all",
      status = "all",
      from,
      to,
      page   = 1,
      limit  = 20,
      search = "",
    } = req.query;

    const data = await transactionsService.getAllTransactions({
      type,
      status,
      from,
      to,
      page:   parseInt(page),
      limit:  Math.min(parseInt(limit), 100),
      search,
    });

    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/transactions/:id ────────────────────────────────────────────────
exports.getTransactionById = async (req, res, next) => {
  try {
    const data = await transactionsService.getTransactionById(req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/transactions ───────────────────────────────────────────────────
exports.createTransaction = async (req, res, next) => {
  try {
    const data = await transactionsService.createTransaction(req.body);
    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/transactions/:id (reversal) ──────────────────────────────────
exports.reverseTransaction = async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: "A reversal reason is required" });
    }
    const data = await transactionsService.reverseTransaction(req.params.id, { reason });
    res.json({ success: true, message: "Transaction reversed successfully", data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/transactions/summary ───────────────────────────────────────────
exports.getSummary = async (req, res, next) => {
  try {
    const { period = "this_month", from, to } = req.query;
    const data = await transactionsService.getSummary({ period, from, to });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/transactions/export ────────────────────────────────────────────
exports.exportTransactions = async (req, res, next) => {
  try {
    const now = new Date();
    const {
      from   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0],
      to     = now.toISOString().split("T")[0],
      type   = "all",
      format = "csv",
    } = req.query;

    const { content, filename, contentType } =
      await transactionsService.exportTransactions({ from, to, type, format });

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", contentType);
    res.send(content);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/transactions/recent ────────────────────────────────────────────
exports.getRecent = async (req, res, next) => {
  try {
    const { limit = 10, type = "all" } = req.query;
    const data = await transactionsService.getRecent({
      limit: Math.min(parseInt(limit), 50),
      type,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/transactions/member/:memberId ───────────────────────────────────
exports.getByMember = async (req, res, next) => {
  try {
    const { type = "all", from, to, page = 1, limit = 20 } = req.query;
    const data = await transactionsService.getByMember(req.params.memberId, {
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

// ─── GET /api/transactions/saving/:savingId ───────────────────────────────────
exports.getBySaving = async (req, res, next) => {
  try {
    const { type = "all", from, to, page = 1, limit = 20 } = req.query;
    const data = await transactionsService.getBySaving(req.params.savingId, {
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

// ─── GET /api/transactions/loan/:loanId ──────────────────────────────────────
exports.getByLoan = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await transactionsService.getByLoan(req.params.loanId, {
      page:  parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};



