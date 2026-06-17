/**
 * api/controllers/interestController.js
 *
 * Thin HTTP layer — reads req, calls interestService, sends JSON.
 * No business logic lives here.
 */

const interestService = require("../services/interestService");

// ─── GET /api/interest ────────────────────────────────────────────────────────
exports.getAllInterest = async (req, res, next) => {
  try {
    const { type = "all", period = "all", page = 1, limit = 20 } = req.query;
    const data = await interestService.getAllInterest({
      type,
      period,
      page:  parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/interest/:id ────────────────────────────────────────────────────
exports.getInterestById = async (req, res, next) => {
  try {
    const data = await interestService.getInterestById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Interest record not found" });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/interest ───────────────────────────────────────────────────────
exports.createInterest = async (req, res, next) => {
  try {
    const data = await interestService.createInterest(req.body);
    res.status(201).json({ success: true, message: "Interest record created successfully", data });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/interest/:id ────────────────────────────────────────────────────
exports.updateInterest = async (req, res, next) => {
  try {
    const data = await interestService.updateInterest(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: "Interest record not found" });
    res.json({ success: true, message: "Interest record updated", data });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/interest/:id ─────────────────────────────────────────────────
exports.deleteInterest = async (req, res, next) => {
  try {
    await interestService.deleteInterest(req.params.id);
    res.json({ success: true, message: "Interest record deleted successfully" });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/interest/calculate/savings ─────────────────────────────────────
exports.calculateSavingsInterest = async (req, res, next) => {
  try {
    const { period = "monthly", asAt, dryRun = false } = req.body;
    const data = await interestService.calculateSavingsInterest({
      period,
      asAt:   asAt ? new Date(asAt) : new Date(),
      dryRun: Boolean(dryRun),
    });
    res.json({
      success: true,
      message: dryRun ? "Dry run — no records saved" : "Savings interest calculated and posted",
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/interest/calculate/loans ──────────────────────────────────────
exports.calculateLoanInterest = async (req, res, next) => {
  try {
    const { period = "monthly", asAt, dryRun = false } = req.body;
    const data = await interestService.calculateLoanInterest({
      period,
      asAt:   asAt ? new Date(asAt) : new Date(),
      dryRun: Boolean(dryRun),
    });
    res.json({
      success: true,
      message: dryRun ? "Dry run — no records saved" : "Loan interest calculated and posted",
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/interest/calculate/all ────────────────────────────────────────
exports.calculateAll = async (req, res, next) => {
  try {
    const { period = "monthly", asAt, dryRun = false } = req.body;
    const data = await interestService.calculateAll({
      period,
      asAt:   asAt ? new Date(asAt) : new Date(),
      dryRun: Boolean(dryRun),
    });
    res.json({
      success: true,
      message: dryRun ? "Dry run — no records saved" : "Full interest cycle completed",
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/interest/summary ────────────────────────────────────────────────
exports.getSummary = async (req, res, next) => {
  try {
    const { period = "this_month", from, to } = req.query;
    const data = await interestService.getSummary({ period, from, to });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/interest/payout ────────────────────────────────────────────────
exports.processPayout = async (req, res, next) => {
  try {
    const { period, memberIds } = req.body;
    const data = await interestService.processPayout({ period, memberIds });
    res.json({ success: true, message: "Interest payout processed successfully", data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/interest/member/:memberId ───────────────────────────────────────
exports.getByMember = async (req, res, next) => {
  try {
    const { type = "all", page = 1, limit = 20 } = req.query;
    const data = await interestService.getByMember(req.params.memberId, {
      type,
      page:  parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/interest/saving/:savingId ───────────────────────────────────────
exports.getBySaving = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await interestService.getBySaving(req.params.savingId, {
      page:  parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/interest/loan/:loanId ──────────────────────────────────────────
exports.getByLoan = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const data = await interestService.getByLoan(req.params.loanId, {
      page:  parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};



