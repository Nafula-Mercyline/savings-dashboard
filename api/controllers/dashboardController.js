/**
 * api/controllers/dashboardController.js
 * Thin HTTP layer — delegates all logic to dashboardService
 */

const dashboardService = require("../services/dashboardService");

// GET /api/dashboard/summary
exports.getSummary = async (req, res, next) => {
  try {
    const data = await dashboardService.getSummary();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/savings
exports.getSavingsTrend = async (req, res, next) => {
  try {
    const { period = "monthly", year = new Date().getFullYear() } = req.query;
    const data = await dashboardService.getSavingsTrend({ period, year });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/loans
exports.getLoanOverview = async (req, res, next) => {
  try {
    const data = await dashboardService.getLoanOverview();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/interest
exports.getInterestSummary = async (req, res, next) => {
  try {
    const { period = "this_month" } = req.query;
    const data = await dashboardService.getInterestSummary({ period });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/members
exports.getMemberActivity = async (req, res, next) => {
  try {
    const data = await dashboardService.getMemberActivity();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// GET /api/dashboard/transactions
exports.getRecentTransactions = async (req, res, next) => {
  try {
    const { limit = 10, type = "all" } = req.query;
    const data = await dashboardService.getRecentTransactions({
      limit: Math.min(Number(limit), 50),
      type,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};



