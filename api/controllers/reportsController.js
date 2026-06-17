/**
 * api/controllers/reportsController.js
 *
 * Thin HTTP layer — reads req, calls reportsService, sends JSON or file.
 * No business logic lives here.
 */

const reportsService = require("../services/reportsService");

// ─── Shared query parser ──────────────────────────────────────────────────────
function parsePeriodQuery(query) {
  const { period = "this_month", from, to } = query;
  return { period, from, to };
}

// ─── GET /api/reports/financial ───────────────────────────────────────────────
exports.getFinancialReport = async (req, res, next) => {
  try {
    const data = await reportsService.getFinancialReport(parsePeriodQuery(req.query));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/savings ─────────────────────────────────────────────────
exports.getSavingsReport = async (req, res, next) => {
  try {
    const data = await reportsService.getSavingsReport(parsePeriodQuery(req.query));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/loans ───────────────────────────────────────────────────
exports.getLoansReport = async (req, res, next) => {
  try {
    const data = await reportsService.getLoansReport(parsePeriodQuery(req.query));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/interest ────────────────────────────────────────────────
exports.getInterestReport = async (req, res, next) => {
  try {
    const data = await reportsService.getInterestReport(parsePeriodQuery(req.query));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/members ─────────────────────────────────────────────────
exports.getMembersReport = async (req, res, next) => {
  try {
    const data = await reportsService.getMembersReport(parsePeriodQuery(req.query));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/transactions ───────────────────────────────────────────
exports.getTransactionsReport = async (req, res, next) => {
  try {
    const { period = "this_month", from, to, groupBy = "day" } = req.query;
    const data = await reportsService.getTransactionsReport({ period, from, to, groupBy });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/arrears ─────────────────────────────────────────────────
exports.getArrearsReport = async (req, res, next) => {
  try {
    const { agingBucket = "all" } = req.query;
    const data = await reportsService.getArrearsReport({ agingBucket });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/balance-sheet ──────────────────────────────────────────
exports.getBalanceSheet = async (req, res, next) => {
  try {
    const { asAt } = req.query;
    const data = await reportsService.getBalanceSheet({
      asAt: asAt ? new Date(asAt) : new Date(),
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/cashflow ────────────────────────────────────────────────
exports.getCashFlowReport = async (req, res, next) => {
  try {
    const data = await reportsService.getCashFlowReport(parsePeriodQuery(req.query));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/export ─────────────────────────────────────────────────
exports.exportReport = async (req, res, next) => {
  try {
    const {
      report = "financial",
      format = "csv",
      period = "this_month",
      from,
      to,
      groupBy = "day",
    } = req.query;

    const { content, filename, contentType } =
      await reportsService.exportReport({ report, format, period, from, to, groupBy });

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", contentType);
    res.send(content);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/reports/scheduled ──────────────────────────────────────────────
exports.getScheduledReports = async (req, res, next) => {
  try {
    const data = await reportsService.getScheduledReports();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/reports/scheduled ─────────────────────────────────────────────
exports.createScheduledReport = async (req, res, next) => {
  try {
    const data = await reportsService.createScheduledReport(req.body);
    res.status(201).json({
      success: true,
      message: "Scheduled report created successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/reports/scheduled/:id ───────────────────────────────────────
exports.deleteScheduledReport = async (req, res, next) => {
  try {
    await reportsService.deleteScheduledReport(req.params.id);
    res.json({ success: true, message: "Scheduled report deleted successfully" });
  } catch (err) {
    next(err);
  }
};



