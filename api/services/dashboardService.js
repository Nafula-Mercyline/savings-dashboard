/**
 * api/services/dashboardService.js
 *
 * Business logic layer for the savings dashboard.
 * All DB queries live here — controllers stay thin.
 *
 * Assumes Sequelize ORM. Swap query syntax for Mongoose/Knex as needed.
 * Models expected: Member, Saving, Loan, Transaction, Interest
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

// ─── 1. Summary KPIs ──────────────────────────────────────────────────────────

/**
 * Returns the headline numbers shown on the dashboard cards:
 *   totalSavings    — sum of all approved saving balances
 *   totalDisbursed  — total loan principal ever disbursed
 *   activeLoans     — count of loans with status "active"
 *   pendingLoans    — count of loans with status "pending"
 *   interestEarned  — interest accrued in the current month
 *   totalMembers    — count of all members
 *   newMembersMonth — members who joined this calendar month
 */
exports.getSummary = async () => {
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

  const transactions = await Transaction.findAll({
    where,
    order:   [["createdAt", "DESC"]],
    limit:   Math.min(Number(limit), 50),
    include: [{
      model:      Member,
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
      id:           t.Member?.id,
      name:         `${t.Member?.firstName} ${t.Member?.lastName}`,
      memberNumber: t.Member?.memberNumber,
    },
  }));
};


