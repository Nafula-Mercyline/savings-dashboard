/**
 * api/services/reportsService.js
 *
 * Business logic for all reports.
 * Uses Sequelize ORM.
 *
 * Models expected: Member, Saving, Loan, Transaction, Interest, ScheduledReport
 */

const { Op, fn, col, literal } = require("sequelize");
const sequelize        = require("../config/db");

const Member           = require("../models/Member");
const Saving           = require("../models/Saving");
const Loan             = require("../models/Loan");
const Transaction      = require("../models/Transaction");
const Interest         = require("../models/Interest");
const ScheduledReport  = require("../models/ScheduledReport");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns { start, end } for a named period string.
 */
function getPeriodRange(period, from, to) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();

  switch (period) {
    case "last_month":
      return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59) };
    case "this_quarter": {
      const q = Math.floor(m / 3);
      return { start: new Date(y, q * 3, 1), end: now };
    }
    case "last_quarter": {
      const q = Math.floor(m / 3) - 1;
      const qy = q < 0 ? y - 1 : y;
      const qa = ((q + 4) % 4);
      return {
        start: new Date(qy, qa * 3, 1),
        end:   new Date(qy, qa * 3 + 3, 0, 23, 59, 59),
      };
    }
    case "ytd":
      return { start: new Date(y, 0, 1), end: now };
    case "custom":
      if (!from || !to) throw Object.assign(
        new Error("from and to are required for custom period"), { status: 400 }
      );
      return { start: new Date(from), end: new Date(`${to}T23:59:59`) };
    case "this_month":
    default:
      return { start: new Date(y, m, 1), end: now };
  }
}

/** Builds a { createdAt: between } where filter from a range object. */
function rangeWhere(range) {
  return { createdAt: { [Op.between]: [range.start, range.end] } };
}

/** Formats a number to 2 decimal places. */
const fmt = (n) => parseFloat((n || 0).toFixed(2));

/** Converts an array of objects to CSV. */
function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines   = rows.map((r) =>
    headers.map((h) => {
      const v = r[h] === null || r[h] === undefined ? "" : String(r[h]);
      return v.includes(",") ? `"${v}"` : v;
    }).join(",")
  );
  return [headers.join(","), ...lines].join("\n");
}

// ─── 1. Financial Report ──────────────────────────────────────────────────────

/**
 * Full income and expense summary for a period (P&L style).
 * Income:   interest earned + loan charges collected
 * Expenses: interest paid out + operational (placeholder)
 * Net:      income - expenses
 */
exports.getFinancialReport = async ({ period, from, to }) => {
  const range = getPeriodRange(period, from, to);
  const where = rangeWhere(range);

  const [
    interestEarned,
    interestCharged,
    interestPaidOut,
    totalDeposits,
    totalWithdrawals,
    totalDisbursed,
    totalRepaid,
  ] = await Promise.all([
    Interest.sum("amount",    { where: { ...where, type: "earned"  } }),
    Interest.sum("amount",    { where: { ...where, type: "charged" } }),
    Interest.sum("amount",    { where: { ...where, type: "paid"    } }),
    Transaction.sum("amount", { where: { ...where, type: "deposit",             status: "completed" } }),
    Transaction.sum("amount", { where: { ...where, type: "withdrawal",          status: "completed" } }),
    Transaction.sum("amount", { where: { ...where, type: "loan_disbursement",   status: "completed" } }),
    Transaction.sum("amount", { where: { ...where, type: "loan_repayment",      status: "completed" } }),
  ]);

  const income   = fmt((interestCharged || 0) + (interestEarned || 0));
  const expenses = fmt(interestPaidOut || 0);
  const net      = fmt(income - expenses);

  return {
    period,
    range:    { from: range.start, to: range.end },
    income: {
      interestOnLoans:   fmt(interestCharged),
      interestOnSavings: fmt(interestEarned),
      total:             income,
    },
    expenses: {
      interestPaidToMembers: fmt(interestPaidOut),
      total:                 expenses,
    },
    netSurplus:         net,
    transactions: {
      totalDeposits:    fmt(totalDeposits),
      totalWithdrawals: fmt(totalWithdrawals),
      totalDisbursed:   fmt(totalDisbursed),
      totalRepaid:      fmt(totalRepaid),
    },
  };
};

// ─── 2. Savings Report ────────────────────────────────────────────────────────

/**
 * Savings portfolio performance report.
 */
exports.getSavingsReport = async ({ period, from, to }) => {
  const range = getPeriodRange(period, from, to);
  const where = rangeWhere(range);

  const [
    totalAccounts,
    activeAccounts,
    totalBalance,
    depositsInPeriod,
    withdrawalsInPeriod,
    newAccountsInPeriod,
    byType,
    topAccounts,
  ] = await Promise.all([
    Saving.count(),
    Saving.count({ where: { status: "active" } }),
    Saving.sum("balance", { where: { status: "active" } }),

    Transaction.sum("amount", { where: { ...where, type: "deposit",    status: "completed" } }),
    Transaction.sum("amount", { where: { ...where, type: "withdrawal", status: "completed" } }),

    Saving.count({ where: { ...where } }),

    // Breakdown by account type
    Saving.findAll({
      attributes: [
        "accountType",
        [fn("COUNT", col("id")),      "count"  ],
        [fn("SUM",   col("balance")), "balance"],
      ],
      where:  { status: "active" },
      group:  ["accountType"],
      raw:    true,
    }),

    // Top 10 accounts by balance
    Saving.findAll({
      where:   { status: "active" },
      include: [{ model: Member, attributes: ["firstName", "lastName", "memberNumber"] }],
      order:   [["balance", "DESC"]],
      limit:   10,
    }),
  ]);

  const netFlow = fmt((depositsInPeriod || 0) - (withdrawalsInPeriod || 0));

  return {
    period,
    range:              { from: range.start, to: range.end },
    totalAccounts,
    activeAccounts,
    totalBalance:       fmt(totalBalance),
    newAccountsInPeriod,
    depositsInPeriod:   fmt(depositsInPeriod),
    withdrawalsInPeriod: fmt(withdrawalsInPeriod),
    netFlow,
    byAccountType:      byType.map((r) => ({
      type:    r.accountType,
      count:   parseInt(r.count),
      balance: fmt(r.balance),
    })),
    topAccounts: topAccounts.map((s) => ({
      accountNumber: s.accountNumber,
      accountType:   s.accountType,
      balance:       fmt(s.balance),
      member:        s.Member
        ? `${s.Member.firstName} ${s.Member.lastName} (${s.Member.memberNumber})`
        : "N/A",
    })),
  };
};

// ─── 3. Loans Report ──────────────────────────────────────────────────────────

/**
 * Loan portfolio report: disbursements, repayments, defaults, top borrowers.
 */
exports.getLoansReport = async ({ period, from, to }) => {
  const range = getPeriodRange(period, from, to);
  const where = rangeWhere(range);
  const now   = new Date();

  const [
    totalLoans,
    activeLoans,
    closedLoans,
    defaultedLoans,
    pendingLoans,
    disbursedInPeriod,
    repaidInPeriod,
    overdueLoans,
    topBorrowers,
    byType,
  ] = await Promise.all([
    Loan.count(),
    Loan.count({ where: { status: "active"    } }),
    Loan.count({ where: { status: "closed"    } }),
    Loan.count({ where: { status: "defaulted" } }),
    Loan.count({ where: { status: "pending"   } }),

    Transaction.sum("amount", { where: { ...where, type: "loan_disbursement", status: "completed" } }),
    Transaction.sum("amount", { where: { ...where, type: "loan_repayment",    status: "completed" } }),

    Loan.findAll({
      where:   { status: "active", dueDate: { [Op.lt]: now } },
      include: [{ model: Member, attributes: ["firstName", "lastName", "phone", "memberNumber"] }],
      order:   [["dueDate", "ASC"]],
      limit:   10,
    }),

    // Top 10 borrowers by outstanding balance
    Loan.findAll({
      where:   { status: "active" },
      include: [{ model: Member, attributes: ["firstName", "lastName", "memberNumber"] }],
      order:   [["balance", "DESC"]],
      limit:   10,
    }),

    // Breakdown by loan type
    Loan.findAll({
      attributes: [
        "loanType",
        [fn("COUNT", col("id")),        "count"    ],
        [fn("SUM",   col("principal")), "principal"],
        [fn("SUM",   col("balance")),   "balance"  ],
      ],
      group: ["loanType"],
      raw:   true,
    }),
  ]);

  const totalOutstanding = await Loan.sum("balance",    { where: { status: "active" } });
  const totalPrincipal   = await Loan.sum("principal",  { where: {} });
  const defaultRate      = totalLoans ? fmt((defaultedLoans / totalLoans) * 100) : 0;

  return {
    period,
    range: { from: range.start, to: range.end },
    portfolio: {
      totalLoans, activeLoans, closedLoans, defaultedLoans, pendingLoans,
      totalPrincipal:   fmt(totalPrincipal),
      totalOutstanding: fmt(totalOutstanding),
      defaultRate:      `${defaultRate}%`,
    },
    periodActivity: {
      disbursedInPeriod: fmt(disbursedInPeriod),
      repaidInPeriod:    fmt(repaidInPeriod),
      netLending:        fmt((disbursedInPeriod || 0) - (repaidInPeriod || 0)),
    },
    byLoanType: byType.map((r) => ({
      type:      r.loanType,
      count:     parseInt(r.count),
      principal: fmt(r.principal),
      balance:   fmt(r.balance),
    })),
    overdueLoans: overdueLoans.map((l) => ({
      id:        l.id,
      reference: l.reference,
      balance:   fmt(l.balance),
      dueDate:   l.dueDate,
      daysOverdue: Math.floor((now - new Date(l.dueDate)) / 86400000),
      member:    l.Member
        ? `${l.Member.firstName} ${l.Member.lastName} — ${l.Member.phone}`
        : "N/A",
    })),
    topBorrowers: topBorrowers.map((l) => ({
      reference:   l.reference,
      principal:   fmt(l.principal),
      balance:     fmt(l.balance),
      member:      l.Member
        ? `${l.Member.firstName} ${l.Member.lastName} (${l.Member.memberNumber})`
        : "N/A",
    })),
  };
};

// ─── 4. Interest Report ───────────────────────────────────────────────────────

exports.getInterestReport = async ({ period, from, to }) => {
  const range = getPeriodRange(period, from, to);
  const where = rangeWhere(range);

  const [earned, charged, paid, countEarned, countCharged] = await Promise.all([
    Interest.sum("amount", { where: { ...where, type: "earned"  } }),
    Interest.sum("amount", { where: { ...where, type: "charged" } }),
    Interest.sum("amount", { where: { ...where, type: "paid"    } }),
    Interest.count(        { where: { ...where, type: "earned"  } }),
    Interest.count(        { where: { ...where, type: "charged" } }),
  ]);

  const netInterestIncome = fmt((charged || 0) - (paid || 0));
  const netInterestMargin = (charged && earned)
    ? fmt(((charged - paid) / earned) * 100)
    : 0;

  // Monthly trend within the period
  const monthlyTrend = await Interest.findAll({
    where,
    attributes: [
      [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "month"],
      "type",
      [fn("SUM", col("amount")), "total"],
    ],
    group: [literal("month"), "type"],
    order: [[literal("month"), "ASC"]],
    raw:   true,
  });

  return {
    period,
    range:  { from: range.start, to: range.end },
    earned: { total: fmt(earned),  count: countEarned  },
    charged:{ total: fmt(charged), count: countCharged },
    paid:   { total: fmt(paid) },
    netInterestIncome,
    netInterestMargin: `${netInterestMargin}%`,
    monthlyTrend,
  };
};

// ─── 5. Members Report ────────────────────────────────────────────────────────

exports.getMembersReport = async ({ period, from, to }) => {
  const range = getPeriodRange(period, from, to);
  const where = rangeWhere(range);
  const now   = new Date();

  const [total, active, inactive, newInPeriod, withLoans, monthlyGrowth] = await Promise.all([
    Member.count(),
    Member.count({ where: { status: "active"   } }),
    Member.count({ where: { status: "inactive" } }),
    Member.count({ where }),

    Loan.count({
      distinct: true,
      col:      "memberId",
      where:    { status: "active" },
    }),

    // Monthly new member counts for trend chart
    Member.findAll({
      attributes: [
        [fn("DATE_FORMAT", col("createdAt"), "%Y-%m"), "month"],
        [fn("COUNT", col("id")), "count"],
      ],
      group: [literal("month")],
      order: [[literal("month"), "ASC"]],
      raw:   true,
    }),
  ]);

  const retentionRate = total ? fmt((active / total) * 100) : 0;

  // Newest members in period
  const newest = await Member.findAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: 10,
    attributes: ["id", "firstName", "lastName", "memberNumber", "phone", "createdAt"],
  });

  return {
    period,
    range:  { from: range.start, to: range.end },
    total,
    active,
    inactive,
    newInPeriod,
    withActiveLoans: withLoans,
    retentionRate:   `${retentionRate}%`,
    monthlyGrowth,
    newestMembers:   newest,
  };
};

// ─── 6. Transactions Report ───────────────────────────────────────────────────

exports.getTransactionsReport = async ({ period, from, to, groupBy = "day" }) => {
  const range = getPeriodRange(period, from, to);
  const where = { ...rangeWhere(range), status: "completed" };

  const formatMap = { day: "%Y-%m-%d", week: "%Y-%u", month: "%Y-%m" };
  const dateFmt   = formatMap[groupBy] || "%Y-%m-%d";

  const [byType, trend, totalCount, totalVolume] = await Promise.all([
    // Totals per type
    Transaction.findAll({
      where,
      attributes: [
        "type",
        [fn("COUNT", col("id")),     "count" ],
        [fn("SUM",   col("amount")), "volume"],
      ],
      group: ["type"],
      raw:   true,
    }),

    // Trend grouped by day/week/month
    Transaction.findAll({
      where,
      attributes: [
        [fn("DATE_FORMAT", col("createdAt"), dateFmt), "period"],
        [fn("COUNT", col("id")),     "count"  ],
        [fn("SUM",   col("amount")), "volume" ],
      ],
      group: [literal("period")],
      order: [[literal("period"), "ASC"]],
      raw:   true,
    }),

    Transaction.count({ where }),
    Transaction.sum("amount", { where }),
  ]);

  return {
    period,
    groupBy,
    range:       { from: range.start, to: range.end },
    totalCount,
    totalVolume: fmt(totalVolume),
    byType:      byType.map((r) => ({
      type:   r.type,
      count:  parseInt(r.count),
      volume: fmt(r.volume),
    })),
    trend,
  };
};

// ─── 7. Arrears Report ────────────────────────────────────────────────────────

/**
 * Overdue loans aged into buckets: 1-30, 31-60, 61-90, 91+ days.
 */
exports.getArrearsReport = async ({ agingBucket }) => {
  const now = new Date();

  const overdueLoans = await Loan.findAll({
    where:   { status: "active", dueDate: { [Op.lt]: now } },
    include: [{
      model:      Member,
      attributes: ["id", "firstName", "lastName", "memberNumber", "phone", "email"],
    }],
    order:   [["dueDate", "ASC"]],
  });

  // Bucket each loan by days overdue
  const buckets = { "1-30": [], "31-60": [], "61-90": [], "91+": [] };

  overdueLoans.forEach((loan) => {
    const days = Math.floor((now - new Date(loan.dueDate)) / 86400000);
    const entry = {
      id:          loan.id,
      reference:   loan.reference,
      principal:   fmt(loan.principal),
      balance:     fmt(loan.balance),
      dueDate:     loan.dueDate,
      daysOverdue: days,
      member: loan.Member
        ? {
            name:         `${loan.Member.firstName} ${loan.Member.lastName}`,
            memberNumber: loan.Member.memberNumber,
            phone:        loan.Member.phone,
            email:        loan.Member.email,
          }
        : null,
    };

    if      (days <= 30)  buckets["1-30"].push(entry);
    else if (days <= 60)  buckets["31-60"].push(entry);
    else if (days <= 90)  buckets["61-90"].push(entry);
    else                  buckets["91+"].push(entry);
  });

  // Filter if a specific bucket was requested
  const filtered = agingBucket !== "all"
    ? { [agingBucket]: buckets[agingBucket] || [] }
    : buckets;

  const totalOverdue   = overdueLoans.length;
  const totalAtRisk    = fmt(overdueLoans.reduce((s, l) => s + parseFloat(l.balance), 0));

  const summary = Object.entries(buckets).map(([bucket, loans]) => ({
    bucket,
    count:  loans.length,
    amount: fmt(loans.reduce((s, l) => s + parseFloat(l.balance), 0)),
  }));

  return {
    asAt: now,
    totalOverdue,
    totalAtRisk,
    summary,
    details: filtered,
  };
};

// ─── 8. Balance Sheet ─────────────────────────────────────────────────────────

/**
 * Point-in-time balance sheet snapshot.
 * Assets     = total savings balances held + outstanding loan book
 * Liabilities = member savings deposits (what we owe members)
 * Equity     = Assets - Liabilities (accumulated surplus)
 */
exports.getBalanceSheet = async ({ asAt }) => {
  const [
    totalSavingsBalance,
    totalLoanBook,
    totalInterestReceivable,
    totalMemberDeposits,
    totalMembers,
    activeMembers,
  ] = await Promise.all([
    Saving.sum("balance",   { where: { status: "active" } }),
    Loan.sum("balance",     { where: { status: "active" } }),
    Interest.sum("amount",  { where: { type: "charged", paidOut: false } }),
    Saving.sum("balance",   { where: { status: "active" } }), // savings = deposits owed to members
    Member.count(),
    Member.count({ where: { status: "active" } }),
  ]);

  const assets = {
    cashAndSavings:      fmt(totalSavingsBalance),
    loanBook:            fmt(totalLoanBook),
    interestReceivable:  fmt(totalInterestReceivable),
    totalAssets:         fmt((totalSavingsBalance || 0) + (totalLoanBook || 0) + (totalInterestReceivable || 0)),
  };

  const liabilities = {
    memberDeposits: fmt(totalMemberDeposits),
    totalLiabilities: fmt(totalMemberDeposits),
  };

  const equity = fmt(assets.totalAssets - liabilities.totalLiabilities);

  return {
    asAt,
    assets,
    liabilities,
    equity,
    membership: { total: totalMembers, active: activeMembers },
  };
};

// ─── 9. Cash Flow Report ──────────────────────────────────────────────────────

/**
 * Cash flow statement split into operating and financing activities.
 */
exports.getCashFlowReport = async ({ period, from, to }) => {
  const range = getPeriodRange(period, from, to);
  const where = { ...rangeWhere(range), status: "completed" };

  const [
    depositsIn,
    withdrawalsOut,
    interestIn,
    interestOut,
    loansDisbursed,
    loansRepaid,
  ] = await Promise.all([
    Transaction.sum("amount", { where: { ...where, type: "deposit"            } }),
    Transaction.sum("amount", { where: { ...where, type: "withdrawal"         } }),
    Transaction.sum("amount", { where: { ...where, type: "interest_credit"    } }),
    Interest.sum("amount",    { where: { ...rangeWhere(range), type: "paid"   } }),
    Transaction.sum("amount", { where: { ...where, type: "loan_disbursement"  } }),
    Transaction.sum("amount", { where: { ...where, type: "loan_repayment"     } }),
  ]);

  const operatingInflow  = fmt((depositsIn  || 0) + (interestIn  || 0));
  const operatingOutflow = fmt((withdrawalsOut || 0) + (interestOut || 0));
  const netOperating     = fmt(operatingInflow - operatingOutflow);

  const financingInflow  = fmt(loansRepaid  || 0);
  const financingOutflow = fmt(loansDisbursed || 0);
  const netFinancing     = fmt(financingInflow - financingOutflow);

  const netCashFlow = fmt(netOperating + netFinancing);

  return {
    period,
    range: { from: range.start, to: range.end },
    operating: {
      inflows: {
        deposits: fmt(depositsIn),
        interestCredit: fmt(interestIn),
        total: operatingInflow,
      },
      outflows: {
        withdrawals: fmt(withdrawalsOut),
        interestPaid: fmt(interestOut),
        total: operatingOutflow,
      },
      net: netOperating,
    },
    financing: {
      inflows: {
        loanRepayments: financingInflow,
        total: financingInflow,
      },
      outflows: {
        loanDisbursements: financingOutflow,
        total: financingOutflow,
      },
      net: netFinancing,
    },
    netCashFlow,
  };
};

// ─── 10. Export Report ────────────────────────────────────────────────────────

/**
 * Generates a named report and serialises it as CSV or Excel.
 * PDF support requires a separate PDF rendering library (e.g. pdfkit / puppeteer).
 */
exports.exportReport = async ({ report, format, period, from, to, groupBy }) => {
  const reportMap = {
    financial:    exports.getFinancialReport,
    savings:      exports.getSavingsReport,
    loans:        exports.getLoansReport,
    interest:     exports.getInterestReport,
    members:      exports.getMembersReport,
    transactions: exports.getTransactionsReport,
    arrears:      exports.getArrearsReport,
    cashflow:     exports.getCashFlowReport,
  };

  const generator = reportMap[report];
  if (!generator) {
    throw Object.assign(new Error(`Unknown report type: "${report}"`), { status: 400 });
  }

  const data     = await generator({ period, from, to, groupBy });
  const dateStr  = new Date().toISOString().split("T")[0];
  const filename = `${report}_report_${dateStr}`;

  if (format === "excel") {
    try {
      const XLSX = require("xlsx");
      const flat = Array.isArray(data) ? data : [data];
      const ws   = XLSX.utils.json_to_sheet(flat);
      const wb   = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, report);
      const content = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return {
        content,
        filename:    `${filename}.xlsx`,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    } catch {
      // xlsx not installed — fall through to JSON-as-CSV
    }
  }

  if (format === "pdf") {
    // Placeholder — wire up pdfkit or puppeteer here
    const content = JSON.stringify(data, null, 2);
    return {
      content,
      filename:    `${filename}.json`,
      contentType: "application/json",
    };
  }

  // Default: CSV
  const flat    = Array.isArray(data) ? data : [data];
  const content = toCSV(flat);
  return {
    content,
    filename:    `${filename}.csv`,
    contentType: "text/csv",
  };
};

// ─── 11. Scheduled Reports ────────────────────────────────────────────────────

exports.getScheduledReports = async () => {
  return ScheduledReport.findAll({ order: [["createdAt", "DESC"]] });
};

exports.createScheduledReport = async (body) => {
  const { reportType, frequency, format, recipients, dayOfMonth } = body;

  if (!Array.isArray(recipients) || !recipients.length) {
    throw Object.assign(new Error("At least one recipient email is required"), { status: 400 });
  }

  return ScheduledReport.create({
    reportType,
    frequency,
    format:     format     || "pdf",
    recipients: JSON.stringify(recipients),
    dayOfMonth: dayOfMonth || 1,
    active:     true,
  });
};

exports.deleteScheduledReport = async (id) => {
  const record = await ScheduledReport.findByPk(id);
  if (!record) throw Object.assign(new Error("Scheduled report not found"), { status: 404 });
  await record.destroy();
};


