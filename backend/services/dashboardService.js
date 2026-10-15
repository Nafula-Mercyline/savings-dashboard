/**
 * api/services/dashboardService.js
 *
 * Business logic layer for the savings dashboard.
 * All DB queries live here — controllers stay thin.
 *
 * Assumes Sequelize ORM. Swap query syntax for Mongoose/Knex as needed.
 * Models expected: Member, Saving, Loan, Transaction, Interest
 *
 * getSummary({ period }) returns the shape the dashboard page expects:
 *   { stats, monthly, recentTransactions, loanSummary, alerts, portfolioHealth }
 * plus the original flat headline fields (totalSavings, totalDisbursed, ...) so
 * anything else already calling /dashboard/summary keeps working.
 *
 * Model facts this file relies on:
 *   - Transaction.type:   deposit | withdrawal | loan_repayment | loan_disbursement | interest_credit | reversal | adjustment
 *   - Transaction.status: completed | pending | reversed | failed
 *       (only "completed" rows count towards totals; a reversed original is excluded)
 *   - Loan.status:        pending | approved | active | closed | rejected | defaulted | cancelled
 *   - Loan.interestRate:  stored as a decimal (0.12 = 12%)
 *   - Loan.dueDate:       DATEONLY ("YYYY-MM-DD")
 *   - Loan.disbursedAt:   used for the monthly "disbursements" figures
 */

const { Op, fn, col, literal, QueryTypes } = require("sequelize");
const sequelize = require("../config/db"); // your Sequelize instance

const Member      = require("../models/Member");
const Saving      = require("../models/Saving");
const Loan        = require("../models/Loan");
const Transaction = require("../models/Transaction");
const Interest    = require("../models/Interest");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns { start, end } Date objects for a named period.
 * period: "this_month" | "last_month" | "ytd"
 */
function getPeriodRange(period) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();

  switch (period) {
    case "last_month":
      return {
        start: new Date(y, m - 1, 1),
        end:   new Date(y, m, 0, 23, 59, 59),
      };
    case "ytd":
      return {
        start: new Date(y, 0, 1),
        end:   now,
      };
    case "this_month":
    default:
      return {
        start: new Date(y, m, 1),
        end:   now,
      };
  }
}

/**
 * Returns the first and last day of each month bucket for a given
 * period ("monthly" = 12 months of `year`, "quarterly" = 4 quarters,
 * "yearly" = last 5 years).
 */
function getBuckets(period, year) {
  const y = parseInt(year, 10);

  if (period === "quarterly") {
    return [0, 1, 2, 3].map((q) => ({
      label: `Q${q + 1} ${y}`,
      start: new Date(y, q * 3, 1),
      end:   new Date(y, q * 3 + 3, 0, 23, 59, 59),
    }));
  }

  if (period === "yearly") {
    return Array.from({ length: 5 }, (_, i) => ({
      label: String(y - 4 + i),
      start: new Date(y - 4 + i, 0, 1),
      end:   new Date(y - 4 + i, 11, 31, 23, 59, 59),
    }));
  }

  // monthly (default) — all 12 months of the given year
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  return months.map((label, i) => ({
    label,
    start: new Date(y, i, 1),
    end:   new Date(y, i + 1, 0, 23, 59, 59),
  }));
}

// ─── Summary helpers (used by getSummary) ─────────────────────────────────────

const MONTH_LABELS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

// A loan due within this many days (and not yet overdue) is classed "At Risk".
const AT_RISK_WINDOW_DAYS = 14;

const pad      = (n) => String(n).padStart(2, "0");
const toNumber = (v) => parseFloat(v) || 0;

/** Date -> "YYYY-MM-DD" (local), for comparing against DATEONLY columns. */
const dateOnly = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Turns a Date or a "YYYY-MM-DD" string into a local Date.
 * (new Date("2026-11-07") is UTC midnight and can shift the day in some timezones.)
 */
function toLocalDate(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

/** "personal_loan" -> "Personal Loan" */
function prettify(code) {
  if (!code) return "";
  return String(code).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** "2026" -> 2026. Falls back to the current year for anything invalid. */
function parseYear(period) {
  const y = parseInt(period, 10);
  return Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : new Date().getFullYear();
}

/** "Oct 08, 09:20" */
function formatDateTime(value) {
  const d = toLocalDate(value);
  if (!d) return "—";
  return `${MONTH_LABELS[d.getMonth()]} ${pad(d.getDate())}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "Nov 07, 2026" */
function formatDate(value) {
  const d = toLocalDate(value);
  if (!d) return "—";
  return `${MONTH_LABELS[d.getMonth()]} ${pad(d.getDate())}, ${d.getFullYear()}`;
}

/** Loan.interestRate is a decimal: 0.12 -> "12%", 0.125 -> "12.5%" */
function formatRate(value) {
  if (value === undefined || value === null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${parseFloat((n * 100).toFixed(2))}%`;
}

/** Change between two values as { change: 12.3, up: true }. */
function pctChange(current, previous) {
  if (!previous) return { change: 0, up: current >= 0 };
  const raw = ((current - previous) / previous) * 100;
  return { change: Math.round(Math.abs(raw) * 10) / 10, up: raw >= 0 };
}

const TX_TYPE_LABELS = {
  deposit:           "Deposit",
  withdrawal:        "Withdrawal",
  loan_repayment:    "Repayment",
  loan_disbursement: "Disbursement",
  interest_credit:   "Interest",
  reversal:          "Reversal",
};

function mapTransactionType(type) {
  const key = String(type || "").toLowerCase();
  return TX_TYPE_LABELS[key] || prettify(key) || "Deposit";
}

function mapTransactionStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending" || s === "processing") return "Pending";
  if (s === "reversed") return "Reversed";
  if (["failed", "rejected", "cancelled", "canceled"].includes(s)) return "Failed";
  return "Success"; // "completed"
}

/**
 * Pending  = application not yet approved
 * Overdue  = defaulted, or past its due date (a loan due today is not yet overdue)
 * At Risk  = due within the next AT_RISK_WINDOW_DAYS days
 * Current  = everything else
 */
function classifyLoan(loan, today) {
  if (loan.status === "pending") return "Pending";
  if (loan.status === "defaulted") return "Overdue";
  const due = toLocalDate(loan.dueDate);
  if (due) {
    if (due < today) return "Overdue";
    if (due - today <= AT_RISK_WINDOW_DAYS * 86400000) return "At Risk";
  }
  return "Current";
}

/** Net savings (completed deposits − completed withdrawals) from the start of time up to `date`. */
async function netSavingsThrough(date) {
  const where = { status: "completed", createdAt: { [Op.lte]: date } };
  const [deposits, withdrawals] = await Promise.all([
    Transaction.sum("amount", { where: { ...where, type: "deposit"    } }),
    Transaction.sum("amount", { where: { ...where, type: "withdrawal" } }),
  ]);
  return (deposits || 0) - (withdrawals || 0);
}

/**
 * Sums `field` for each of the 12 months between start and end (grouped on `dateField`).
 * Returns an array of 12 numbers.
 */
async function monthlyTotals(Model, field, extraWhere, start, end, dateField = "createdAt") {
  const rows = await Model.findAll({
    attributes: [
      [fn("MONTH", col(dateField)), "month"],
      [fn("SUM", col(field)), "total"],
    ],
    where: { ...extraWhere, [dateField]: { [Op.between]: [start, end] } },
    group: [fn("MONTH", col(dateField))],
    raw:   true,
  });

  const totals = Array(12).fill(0);
  rows.forEach((r) => {
    totals[Number(r.month) - 1] = toNumber(r.total);
  });
  return totals;
}

// ─── 1. Summary KPIs ──────────────────────────────────────────────────────────

/**
 * The original headline numbers (kept so existing callers don't break):
 *   totalSavings    — sum of all approved saving balances
 *   totalDisbursed  — total loan principal ever disbursed
 *   activeLoans     — count of loans with status "active"
 *   pendingLoans    — count of loans with status "pending"
 *   interestEarned  — interest accrued in the current month
 *   totalMembers    — count of all members
 *   newMembersMonth — members who joined this calendar month
 */
async function getHeadlineMetrics() {
  const now         = new Date();
  const monthStart  = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalSavings,
    totalDisbursed,
    activeLoans,
    pendingLoans,
    interestEarned,
    totalMembers,
    newMembersMonth,
  ] = await Promise.all([

    // Sum of all saving balances
    Saving.sum("balance", { where: { status: "active" } }),

    // Total principal ever disbursed
    Loan.sum("principal", { where: { status: { [Op.in]: ["active", "closed"] } } }),

    // Active loan count
    Loan.count({ where: { status: "active" } }),

    // Pending (awaiting approval) loan count
    Loan.count({ where: { status: "pending" } }),

    // Interest accrued this month
    Interest.sum("amount", {
      where: {
        type:      "earned",
        createdAt: { [Op.gte]: monthStart },
      },
    }),

    // Total member count
    Member.count(),

    // New members this month
    Member.count({ where: { createdAt: { [Op.gte]: monthStart } } }),
  ]);

  return {
    totalSavings:    totalSavings    || 0,
    totalDisbursed:  totalDisbursed  || 0,
    activeLoans:     activeLoans     || 0,
    pendingLoans:    pendingLoans    || 0,
    interestEarned:  interestEarned  || 0,
    totalMembers:    totalMembers    || 0,
    newMembersMonth: newMembersMonth || 0,
  };
}

/**
 * Everything the dashboard page needs for one year.
 *
 * @param {Object} options
 * @param {string|number} options.period — the year, e.g. "2026"
 *
 * Notes on past years: savings and member counts are rebuilt "as of" the end of
 * that year from transactions / join dates. Loan balances use today's balance for
 * loans that existed by then, because balance history isn't stored.
 */
exports.getSummary = async ({ period } = {}) => {
  const now         = new Date();
  const year        = parseYear(period);
  const currentYear = now.getFullYear();
  const isCurrent   = year === currentYear;

  const yearStart = new Date(year, 0, 1);
  const yearEnd   = new Date(year, 11, 31, 23, 59, 59);
  const prevStart = new Date(year - 1, 0, 1);
  const prevEnd   = new Date(year - 1, 11, 31, 23, 59, 59);
  const asOf      = isCurrent ? now : yearEnd;

  // DATEONLY comparisons use plain "YYYY-MM-DD" strings
  const today      = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr   = dateOnly(today);
  const soonStr    = dateOnly(new Date(today.getTime() + AT_RISK_WINDOW_DAYS * 86400000));
  const asOfStr    = dateOnly(asOf);
  const prevEndStr = dateOnly(prevEnd);

  // Current year stops at the current month; past years show all 12; future years show none.
  const lastMonthIdx = year > currentYear ? -1 : isCurrent ? now.getMonth() : 11;

  const openStatuses = { [Op.in]: ["active", "defaulted"] };
  const bookWhere    = { status: openStatuses, createdAt: { [Op.lte]: asOf } };

  // The loans table also lists applications still waiting for approval (current year only),
  // so they can be edited from the dashboard. They are NOT part of the portfolio figures above.
  const listWhere = {
    status:    { [Op.in]: isCurrent ? ["pending", "active", "defaulted"] : ["active", "defaulted"] },
    createdAt: { [Op.lte]: asOf },
  };

  const [
    headline,
    savingsNow,
    savingsPrev,
    portfolioNow,
    portfolioPrev,
    membersNow,
    membersPrev,
    interestNow,
    interestPrev,
    overdueNow,
    overduePrev,
    depositsByMonth,
    disbursedByMonth,
    repaymentsByMonth,
    interestByMonth,
    recentRows,
    loanRows,
    overdueBalance,
    atRiskBalance,
  ] = await Promise.all([
    getHeadlineMetrics(),

    // Savings: today's balance for the current year, otherwise net deposits up to year end
    isCurrent
      ? Saving.sum("balance", { where: { status: "active" } })
      : netSavingsThrough(yearEnd),
    netSavingsThrough(prevEnd),

    // Loan portfolio = outstanding balance on open loans
    Loan.sum("balance", { where: bookWhere }),
    Loan.sum("balance", { where: { status: openStatuses, createdAt: { [Op.lte]: prevEnd } } }),

    // Members who had joined by the end of the year / previous year
    Member.count({ where: { createdAt: { [Op.lte]: yearEnd } } }),
    Member.count({ where: { createdAt: { [Op.lte]: prevEnd } } }),

    // Interest earned in the year / previous year
    Interest.sum("amount", { where: { type: "earned", createdAt: { [Op.between]: [yearStart, yearEnd] } } }),
    Interest.sum("amount", { where: { type: "earned", createdAt: { [Op.between]: [prevStart, prevEnd] } } }),

    // Overdue open loans
    Loan.count({ where: { ...bookWhere, dueDate: { [Op.lt]: asOfStr } } }),
    Loan.count({ where: { status: openStatuses, createdAt: { [Op.lte]: prevEnd }, dueDate: { [Op.lt]: prevEndStr } } }),

    // Monthly chart figures (completed transactions only)
    monthlyTotals(Transaction, "amount",    { status: "completed", type: "deposit" },        yearStart, yearEnd),
    monthlyTotals(Loan,        "principal", { status: { [Op.in]: ["active", "closed", "defaulted"] } }, yearStart, yearEnd, "disbursedAt"),
    monthlyTotals(Transaction, "amount",    { status: "completed", type: "loan_repayment" }, yearStart, yearEnd),
    monthlyTotals(Interest,    "amount",    { type: "earned" },                              yearStart, yearEnd),

    // Latest 5 transactions in the year (every status, so reversals are visible)
    Transaction.findAll({
      where: { createdAt: { [Op.between]: [yearStart, yearEnd] } },
      order: [["createdAt", "DESC"]],
      limit: 5,
      raw:   true,
    }),

    // 5 loans: pending applications first, then the earliest due dates
    Loan.findAll({
      where: listWhere,
      order: [
        [literal("CASE WHEN status = 'pending' THEN 0 ELSE 1 END"), "ASC"],
        ["dueDate", "ASC"],
      ],
      limit: 5,
      raw:   true,
    }),

    // Portfolio health: balance that is overdue / due soon
    Loan.sum("balance", {
      where: {
        ...bookWhere,
        [Op.or]: [{ status: "defaulted" }, { dueDate: { [Op.lt]: todayStr } }],
      },
    }),
    Loan.sum("balance", {
      where: {
        ...bookWhere,
        status:  "active",
        dueDate: { [Op.gte]: todayStr, [Op.lte]: soonStr },
      },
    }),
  ]);

  // Member names (looked up separately so we don't depend on model associations)
  const memberIds = [
    ...new Set([...recentRows, ...loanRows].map((r) => r.memberId).filter(Boolean)),
  ];
  const members = memberIds.length
    ? await Member.findAll({
        where:      { id: { [Op.in]: memberIds } },
        attributes: ["id", "firstName", "lastName"],
        raw:        true,
      })
    : [];
  const nameById = new Map(
    members.map((m) => [m.id, `${m.firstName || ""} ${m.lastName || ""}`.trim() || "Unknown member"])
  );
  const nameOf = (id) => nameById.get(id) || "Unknown member";

  // ── KPIs ──
  const savings   = toNumber(savingsNow);
  const portfolio = toNumber(portfolioNow);
  const interest  = toNumber(interestNow);

  const stats = {
    totalSavings:  { value: Math.round(savings),   ...pctChange(savings,   toNumber(savingsPrev))   },
    loanPortfolio: { value: Math.round(portfolio), ...pctChange(portfolio, toNumber(portfolioPrev)) },
    activeMembers: { value: membersNow || 0,       ...pctChange(membersNow || 0, membersPrev || 0)  },
    interestIncome:{ value: Math.round(interest),  ...pctChange(interest,  toNumber(interestPrev))  },
    overdueLoans:  { value: overdueNow || 0,       ...pctChange(overdueNow || 0, overduePrev || 0)  },
  };

  // ── Monthly chart ──
  const monthly = MONTH_LABELS.slice(0, lastMonthIdx + 1).map((month, i) => ({
    month,
    savings:    Math.round(depositsByMonth[i]),
    loans:      Math.round(disbursedByMonth[i]),
    repayments: Math.round(repaymentsByMonth[i]),
    interest:   Math.round(interestByMonth[i]),
  }));

  // ── Transactions table ──
  const recentTransactions = recentRows.map((t) => ({
    id:        t.id,
    memberId:  t.memberId,
    reference: t.reference,
    txType:    t.type,   // raw values, used by the dashboard to decide which actions to offer
    txStatus:  t.status,
    member:    nameOf(t.memberId),
    type:      mapTransactionType(t.type),
    amount:    toNumber(t.amount),
    time:      formatDateTime(t.createdAt),
    status:    mapTransactionStatus(t.status),
  }));

  // ── Loans table ──
  const loanSummary = loanRows.map((l) => ({
    id:          l.id,
    memberId:    l.memberId,
    reference:   l.reference,
    loanStatus:  l.status,                      // raw status: pending / active / defaulted
    member:      nameOf(l.memberId),
    type:        prettify(l.loanType) || "Loan",
    principal:   toNumber(l.principal),
    outstanding: l.status === "pending" ? toNumber(l.principal) : toNumber(l.balance),
    rate:        formatRate(l.interestRate),
    rateDecimal: toNumber(l.interestRate),      // e.g. 0.12, used to pre-fill the edit form
    termMonths:  l.termMonths,
    purpose:     l.purpose || "",
    nextDue:     l.dueDate ? formatDate(l.dueDate) : "—",
    status:      classifyLoan(l, today),
  }));

  // ── Portfolio health (by outstanding balance) ──
  let portfolioHealth = [];
  if (portfolio > 0) {
    const overduePct = Math.min(100, Math.round((toNumber(overdueBalance) / portfolio) * 100));
    const atRiskPct  = Math.min(100 - overduePct, Math.round((toNumber(atRiskBalance) / portfolio) * 100));
    const currentPct = Math.max(0, 100 - overduePct - atRiskPct);
    portfolioHealth = [
      { label: "Current", pct: currentPct, color: "#34d399" },
      { label: "At Risk", pct: atRiskPct,  color: "#f59e0b" },
      { label: "Overdue", pct: overduePct, color: "#f87171" },
    ];
  }

  // ── Alerts ──
  const stamp  = formatDateTime(now);
  const alerts = [];

  if (stats.overdueLoans.value > 0) {
    const n = stats.overdueLoans.value;
    alerts.push({
      type:    "warning",
      message: isCurrent
        ? `${n} loan ${n === 1 ? "account is" : "accounts are"} past due and need follow-up.`
        : `${n} loan ${n === 1 ? "account was" : "accounts were"} past due by the end of ${year}.`,
      time: stamp,
    });
  }

  if (isCurrent && headline.pendingLoans > 0) {
    const n = headline.pendingLoans;
    alerts.push({
      type:    "info",
      message: `${n} loan ${n === 1 ? "application is" : "applications are"} awaiting approval.`,
      time:    stamp,
    });
  }

  if (stats.totalSavings.up && stats.totalSavings.change > 0) {
    alerts.push({
      type:    "success",
      message: `Total savings grew ${stats.totalSavings.change}% compared with the end of ${year - 1}.`,
      time:    stamp,
    });
  }

  return {
    year,
    stats,
    monthly,
    recentTransactions,
    loanSummary,
    alerts,
    portfolioHealth,
    ...headline, // original flat fields, kept for backward compatibility
  };
};

// ─── 2. Savings Trend ─────────────────────────────────────────────────────────

/**
 * Returns an array of buckets, each with:
 *   label       — e.g. "Jan", "Q1 2026", "2024"
 *   deposits    — total deposit amount in the bucket
 *   withdrawals — total withdrawal amount in the bucket
 *   net         — deposits - withdrawals
 *
 * @param {Object} options
 * @param {string} options.period  — "monthly" | "quarterly" | "yearly"
 * @param {number} options.year    — e.g. 2026
 */
exports.getSavingsTrend = async ({ period = "monthly", year } = {}) => {
  const y       = year || new Date().getFullYear();
  const buckets = getBuckets(period, y);

  const results = await Promise.all(
    buckets.map(async (bucket) => {
      const where = { createdAt: { [Op.between]: [bucket.start, bucket.end] } };

      const [deposits, withdrawals] = await Promise.all([
        Transaction.sum("amount", { where: { ...where, type: "deposit"    } }),
        Transaction.sum("amount", { where: { ...where, type: "withdrawal" } }),
      ]);

      const dep  = deposits    || 0;
      const with_ = withdrawals || 0;

      return {
        label:       bucket.label,
        deposits:    dep,
        withdrawals: with_,
        net:         dep - with_,
      };
    })
  );

  return results;
};

// ─── 3. Loan Overview ─────────────────────────────────────────────────────────

/**
 * Returns a breakdown of the loan portfolio:
 *   statusCounts   — { active, pending, closed, defaulted }
 *   totalDisbursed — lifetime principal disbursed
 *   totalOutstanding — principal still owed on active loans
 *   totalRepaid    — amount repaid to date (all loans)
 *   overdueCount   — active loans past their due date
 */
exports.getLoanOverview = async () => {
  const now = new Date();

  const [
    active, pending, closed, defaulted,
    totalDisbursed, totalOutstanding, totalRepaid, overdueCount,
  ] = await Promise.all([
    Loan.count({ where: { status: "active"    } }),
    Loan.count({ where: { status: "pending"   } }),
    Loan.count({ where: { status: "closed"    } }),
    Loan.count({ where: { status: "defaulted" } }),

    Loan.sum("principal",   { where: { status: { [Op.in]: ["active","closed","defaulted"] } } }),
    Loan.sum("balance",     { where: { status: "active" } }),
    Loan.sum("totalRepaid", { where: {} }),

    Loan.count({
      where: {
        status:  "active",
        dueDate: { [Op.lt]: now },
      },
    }),
  ]);

  return {
    statusCounts: {
      active:    active    || 0,
      pending:   pending   || 0,
      closed:    closed    || 0,
      defaulted: defaulted || 0,
    },
    totalDisbursed:   totalDisbursed   || 0,
    totalOutstanding: totalOutstanding || 0,
    totalRepaid:      totalRepaid      || 0,
    overdueCount:     overdueCount     || 0,
  };
};

// ─── 4. Interest Summary ──────────────────────────────────────────────────────

/**
 * Returns interest figures for the requested period:
 *   earned     — interest accrued on savings
 *   paid       — interest paid out to members
 *   charged    — interest charged on loans
 *   projected  — simple projection based on current balances × monthly rate
 *
 * @param {Object} options
 * @param {string} options.period — "this_month" | "last_month" | "ytd"
 */
exports.getInterestSummary = async ({ period = "this_month" } = {}) => {
  const { start, end } = getPeriodRange(period);
  const dateFilter      = { createdAt: { [Op.between]: [start, end] } };

  const [earned, paid, charged] = await Promise.all([
    Interest.sum("amount", { where: { ...dateFilter, type: "earned"  } }),
    Interest.sum("amount", { where: { ...dateFilter, type: "paid"    } }),
    Interest.sum("amount", { where: { ...dateFilter, type: "charged" } }),
  ]);

  // Projected = total active savings × assumed monthly rate (e.g. 1.5 %)
  const MONTHLY_RATE    = 0.015;
  const totalActiveSavings = await Saving.sum("balance", { where: { status: "active" } });
  const projected       = Math.round((totalActiveSavings || 0) * MONTHLY_RATE);

  return {
    period,
    earned:    earned    || 0,
    paid:      paid      || 0,
    charged:   charged   || 0,
    projected,
  };
};

// ─── 5. Member Activity ───────────────────────────────────────────────────────

/**
 * Returns a member activity snapshot:
 *   totalMembers   — all members
 *   activeMembers  — members with at least one transaction this month
 *   inactiveMembers
 *   newThisMonth   — members who joined this calendar month
 *   overdueMembers — members with at least one overdue loan
 *   topSavers      — top 5 members by savings balance
 */
exports.getMemberActivity = async () => {
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Members who transacted this month
  const activeMemberIds = await Transaction.findAll({
    attributes: [[fn("DISTINCT", col("memberId")), "memberId"]],
    where:      { createdAt: { [Op.gte]: monthStart } },
    raw:        true,
  }).then((rows) => rows.map((r) => r.memberId));

  const [
    totalMembers,
    newThisMonth,
    overdueMembers,
    topSavers,
  ] = await Promise.all([

    Member.count(),

    Member.count({ where: { createdAt: { [Op.gte]: monthStart } } }),

    // Members with at least one overdue active loan
    Loan.count({
      distinct: true,
      col:      "memberId",
      where:    { status: "active", dueDate: { [Op.lt]: now } },
    }),

    // Top 5 by total savings balance
    Saving.findAll({
      attributes: [
        "memberId",
        [fn("SUM", col("balance")), "totalBalance"],
      ],
      where:      { status: "active" },
      group:      ["memberId", "Member.id", "Member.firstName", "Member.lastName"],
      order:      [[literal("totalBalance"), "DESC"]],
      limit:      5,
      include:    [{
        model:      Member,
        attributes: ["id", "firstName", "lastName"],
      }],
      raw:        true,
      nest:       true,
    }),
  ]);

  return {
    totalMembers,
    activeMembers:   activeMemberIds.length,
    inactiveMembers: totalMembers - activeMemberIds.length,
    newThisMonth,
    overdueMembers,
    topSavers: topSavers.map((s) => ({
      memberId:     s.memberId,
      name:         `${s.Member.firstName} ${s.Member.lastName}`,
      totalBalance: parseFloat(s.totalBalance) || 0,
    })),
  };
};

// ─── 6. Recent Transactions ───────────────────────────────────────────────────

/**
 * Returns the most recent transactions across all members.
 *
 * @param {Object} options
 * @param {number} options.limit — max records (1–50, default 10)
 * @param {string} options.type  — "deposit"|"withdrawal"|"loan_repayment"|"all"
 */
exports.getRecentTransactions = async ({ limit = 10, type = "all" } = {}) => {
  const where = {};

  if (type !== "all") {
    where.type = type;
  }

  // Transaction.belongsTo(Member) is declared with `as: "member"`, so the include must use it.
  const transactions = await Transaction.findAll({
    where,
    order:   [["createdAt", "DESC"]],
    limit:   Math.min(Number(limit), 50),
    include: [{
      model:      Member,
      as:         "member",
      attributes: ["id", "firstName", "lastName", "memberNumber"],
    }],
  });

  return transactions.map((t) => ({
    id:           t.id,
    type:         t.type,
    amount:       t.amount,
    reference:    t.reference,
    description:  t.description,
    createdAt:    t.createdAt,
    member: {
      id:           t.member?.id,
      name:         `${t.member?.firstName} ${t.member?.lastName}`,
      memberNumber: t.member?.memberNumber,
    },
  }));
};
