/**
 * api/services/interestService.js
 *
 * All business logic for interest management.
 * Handles savings interest (earned), loan interest (charged),
 * end-of-period cycles, and payouts.
 *
 * Uses Sequelize ORM.
 * Models expected: Interest, Saving, Loan, Member, Transaction
 */

const { Op, fn, col, literal } = require("sequelize");
const sequelize   = require("../config/db");

const Interest    = require("../models/Interest");
const Saving      = require("../models/Saving");
const Loan        = require("../models/Loan");
const Member      = require("../models/Member");
const Transaction = require("../models/Transaction");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns { start, end } Date objects for a named period.
 * period: "this_month" | "last_month" | "ytd" | "all" | "custom"
 */
function getPeriodRange(period, from, to) {
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
    case "custom":
      if (!from || !to) throw Object.assign(
        new Error("from and to dates are required for custom period"),
        { status: 400 }
      );
      return {
        start: new Date(from),
        end:   new Date(`${to}T23:59:59`),
      };
    case "all":
      return null; // no date filter
    case "this_month":
    default:
      return {
        start: new Date(y, m, 1),
        end:   now,
      };
  }
}

/**
 * Builds a Sequelize createdAt filter from a period range object.
 * Returns {} if range is null (all time).
 */
function buildRangeFilter(range) {
  if (!range) return {};
  return { createdAt: { [Op.between]: [range.start, range.end] } };
}

/**
 * Calculates monthly savings interest for a single account.
 * Formula: balance × (annualRate / 12)
 */
function calcSavingsInterest(balance, annualRate) {
  return parseFloat((balance * (annualRate / 12)).toFixed(2));
}

/**
 * Calculates monthly loan interest for a single loan.
 * Formula: outstandingBalance × (annualRate / 12)
 */
function calcLoanInterest(balance, annualRate) {
  return parseFloat((balance * (annualRate / 12)).toFixed(2));
}

/**
 * Returns the label for the current period e.g. "2026-05"
 */
function periodLabel(asAt) {
  const d = asAt || new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── 1. Get All Interest Records ──────────────────────────────────────────────

/**
 * Returns paginated list of all interest records.
 * @param {Object} options
 * @param {string} options.type    — "earned" | "charged" | "paid" | "all"
 * @param {string} options.period  — "this_month" | "last_month" | "ytd" | "all"
 * @param {number} options.page
 * @param {number} options.limit
 */
exports.getAllInterest = async ({ type, period, page, limit }) => {
  const offset = (page - 1) * limit;
  const range  = getPeriodRange(period);

  const where = { ...buildRangeFilter(range) };
  if (type !== "all") where.type = type;

  const { count, rows } = await Interest.findAndCountAll({
    where,
    include: [{
      model:      Member,
      attributes: ["id", "firstName", "lastName", "memberNumber"],
    }],
    order:  [["createdAt", "DESC"]],
    limit,
    offset,
  });

  return {
    data: rows,
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─── 2. Get Interest By ID ────────────────────────────────────────────────────

exports.getInterestById = async (id) => {
  return Interest.findByPk(id, {
    include: [{
      model:      Member,
      attributes: ["id", "firstName", "lastName", "memberNumber"],
    }],
  });
};

// ─── 3. Create Interest Record (manual) ───────────────────────────────────────

/**
 * Manually creates an interest record (adjustments / corrections).
 * @param {Object} body
 * @param {number} body.memberId
 * @param {string} body.type      — "earned" | "charged" | "paid"
 * @param {number} body.amount
 * @param {number} body.savingId  — optional
 * @param {number} body.loanId    — optional
 * @param {string} body.notes
 * @param {string} body.period    — e.g. "2026-05"
 */
exports.createInterest = async (body) => {
  const { memberId, type, amount, savingId, loanId, notes, period } = body;

  const member = await Member.findByPk(memberId);
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  return Interest.create({
    memberId,
    type,
    amount:   parseFloat(amount),
    savingId: savingId || null,
    loanId:   loanId   || null,
    notes:    notes    || null,
    period:   period   || periodLabel(),
    source:   "manual",
  });
};

// ─── 4. Update Interest Record ────────────────────────────────────────────────

exports.updateInterest = async (id, body) => {
  const record = await Interest.findByPk(id);
  if (!record) return null;

  if (body.amount !== undefined) record.amount = parseFloat(body.amount);
  if (body.notes  !== undefined) record.notes  = body.notes;

  await record.save();
  return record;
};

// ─── 5. Delete Interest Record ────────────────────────────────────────────────

exports.deleteInterest = async (id) => {
  const record = await Interest.findByPk(id);
  if (!record) throw Object.assign(new Error("Interest record not found"), { status: 404 });
  await record.destroy();
};

// ─── 6. Calculate Savings Interest ───────────────────────────────────────────

/**
 * Calculates and posts interest earned on all active saving accounts.
 * Skips accounts that already have an interest record for this period.
 *
 * @param {Object} options
 * @param {string} options.period  — "monthly" | "quarterly"
 * @param {Date}   options.asAt    — reference date (default: today)
 * @param {boolean} options.dryRun — preview without saving
 */
exports.calculateSavingsInterest = async ({ period = "monthly", asAt = new Date(), dryRun = false }) => {
  const label    = periodLabel(asAt);
  const savings  = await Saving.findAll({
    where:   { status: "active" },
    include: [{ model: Member, attributes: ["id", "firstName", "lastName"] }],
  });

  const results = [];

  for (const saving of savings) {
    // Skip if already calculated for this period
    const existing = await Interest.findOne({
      where: { savingId: saving.id, period: label, type: "earned" },
    });
    if (existing) {
      results.push({
        savingId:  saving.id,
        memberId:  saving.memberId,
        skipped:   true,
        reason:    "Already calculated for this period",
      });
      continue;
    }

    const amount = calcSavingsInterest(saving.balance, saving.interestRate);

    if (!dryRun && amount > 0) {
      await Interest.create({
        memberId:  saving.memberId,
        savingId:  saving.id,
        type:      "earned",
        amount,
        period:    label,
        source:    "system",
        notes:     `Auto-calculated ${period} savings interest`,
      });
    }

    results.push({
      savingId:      saving.id,
      memberId:      saving.memberId,
      memberName:    `${saving.Member.firstName} ${saving.Member.lastName}`,
      balance:       saving.balance,
      interestRate:  saving.interestRate,
      interestEarned: amount,
      period:        label,
      saved:         !dryRun && amount > 0,
    });
  }

  const totalEarned = results.reduce((s, r) => s + (r.interestEarned || 0), 0);

  return {
    period:      label,
    dryRun,
    totalAccounts: savings.length,
    processed:   results.filter((r) => !r.skipped).length,
    skipped:     results.filter((r) => r.skipped).length,
    totalEarned: parseFloat(totalEarned.toFixed(2)),
    breakdown:   results,
  };
};

// ─── 7. Calculate Loan Interest ───────────────────────────────────────────────

/**
 * Calculates and posts interest charged on all active loans.
 * Skips loans that already have a charge record for this period.
 *
 * @param {Object} options
 * @param {string}  options.period
 * @param {Date}    options.asAt
 * @param {boolean} options.dryRun
 */
exports.calculateLoanInterest = async ({ period = "monthly", asAt = new Date(), dryRun = false }) => {
  const label = periodLabel(asAt);
  const loans = await Loan.findAll({
    where:   { status: "active" },
    include: [{ model: Member, attributes: ["id", "firstName", "lastName"] }],
  });

  const results = [];

  for (const loan of loans) {
    const existing = await Interest.findOne({
      where: { loanId: loan.id, period: label, type: "charged" },
    });
    if (existing) {
      results.push({
        loanId:   loan.id,
        memberId: loan.memberId,
        skipped:  true,
        reason:   "Already calculated for this period",
      });
      continue;
    }

    const amount = calcLoanInterest(loan.balance, loan.interestRate);

    if (!dryRun && amount > 0) {
      await Interest.create({
        memberId: loan.memberId,
        loanId:   loan.id,
        type:     "charged",
        amount,
        period:   label,
        source:   "system",
        notes:    `Auto-calculated ${period} loan interest`,
      });
    }

    results.push({
      loanId:          loan.id,
      memberId:        loan.memberId,
      memberName:      `${loan.Member.firstName} ${loan.Member.lastName}`,
      loanBalance:     loan.balance,
      interestRate:    loan.interestRate,
      interestCharged: amount,
      period:          label,
      saved:           !dryRun && amount > 0,
    });
  }

  const totalCharged = results.reduce((s, r) => s + (r.interestCharged || 0), 0);

  return {
    period:      label,
    dryRun,
    totalLoans:  loans.length,
    processed:   results.filter((r) => !r.skipped).length,
    skipped:     results.filter((r) => r.skipped).length,
    totalCharged: parseFloat(totalCharged.toFixed(2)),
    breakdown:   results,
  };
};

// ─── 8. Calculate All (Full Cycle) ────────────────────────────────────────────

/**
 * Runs the full end-of-period interest cycle atomically.
 * Calculates savings interest AND loan interest in one go.
 *
 * @param {Object} options
 * @param {string}  options.period
 * @param {Date}    options.asAt
 * @param {boolean} options.dryRun
 */
exports.calculateAll = async ({ period = "monthly", asAt = new Date(), dryRun = false }) => {
  const [savingsResult, loansResult] = await Promise.all([
    exports.calculateSavingsInterest({ period, asAt, dryRun }),
    exports.calculateLoanInterest({ period, asAt, dryRun }),
  ]);

  return {
    period:        periodLabel(asAt),
    dryRun,
    savings:       savingsResult,
    loans:         loansResult,
    totalEarned:   savingsResult.totalEarned,
    totalCharged:  loansResult.totalCharged,
    netInterest:   parseFloat(
      (savingsResult.totalEarned - loansResult.totalCharged).toFixed(2)
    ),
  };
};

// ─── 9. Get Summary ───────────────────────────────────────────────────────────

/**
 * Returns aggregated interest totals for a period.
 * @param {Object} options
 * @param {string} options.period — "this_month" | "last_month" | "ytd" | "custom"
 * @param {string} options.from   — YYYY-MM-DD (required for custom)
 * @param {string} options.to     — YYYY-MM-DD (required for custom)
 */
exports.getSummary = async ({ period, from, to }) => {
  const range = getPeriodRange(period, from, to);
  const where = buildRangeFilter(range);

  const [earned, charged, paid] = await Promise.all([
    Interest.sum("amount", { where: { ...where, type: "earned"  } }),
    Interest.sum("amount", { where: { ...where, type: "charged" } }),
    Interest.sum("amount", { where: { ...where, type: "paid"    } }),
  ]);

  const [earnedCount, chargedCount, paidCount] = await Promise.all([
    Interest.count({ where: { ...where, type: "earned"  } }),
    Interest.count({ where: { ...where, type: "charged" } }),
    Interest.count({ where: { ...where, type: "paid"    } }),
  ]);

  return {
    period,
    range: range ? { from: range.start, to: range.end } : "all time",
    earned:  { total: earned  || 0, count: earnedCount  },
    charged: { total: charged || 0, count: chargedCount },
    paid:    { total: paid    || 0, count: paidCount    },
    net:     parseFloat(((earned || 0) - (paid || 0)).toFixed(2)),
  };
};

// ─── 10. Process Payout ───────────────────────────────────────────────────────

/**
 * Disburses earned (but unpaid) interest to members' saving accounts.
 * Marks each interest record as "paid" and credits the saving balance.
 *
 * @param {Object} options
 * @param {string}   options.period    — period label e.g. "2026-05"
 * @param {number[]} options.memberIds — optional subset of members
 */
exports.processPayout = async ({ period, memberIds }) => {
  const where = { type: "earned", source: "system", paidOut: false };
  if (period)    where.period   = period;
  if (memberIds && memberIds.length) where.memberId = { [Op.in]: memberIds };

  const records = await Interest.findAll({ where });

  if (!records.length) {
    throw Object.assign(
      new Error("No unpaid interest records found for the given criteria"),
      { status: 404 }
    );
  }

  let totalPaidOut  = 0;
  let successCount  = 0;
  const errors      = [];

  for (const record of records) {
    try {
      await sequelize.transaction(async (t) => {
        // Credit the member's primary active saving account
        const saving = await Saving.findOne({
          where:       { memberId: record.memberId, status: "active" },
          lock:        t.LOCK.UPDATE,
          transaction: t,
        });

        if (!saving) throw new Error(`No active saving account for member ${record.memberId}`);

        saving.balance = parseFloat(saving.balance) + parseFloat(record.amount);
        await saving.save({ transaction: t });

        // Mark interest record as paid out
        record.paidOut   = true;
        record.paidOutAt = new Date();
        await record.save({ transaction: t });

        // Record as a Transaction
        await Transaction.create({
          memberId:    record.memberId,
          savingId:    saving.id,
          type:        "interest_credit",
          amount:      parseFloat(record.amount),
          description: `Interest payout — period ${record.period}`,
          reference:   `INT-${record.id}`,
        }, { transaction: t });
      });

      totalPaidOut += parseFloat(record.amount);
      successCount++;
    } catch (err) {
      errors.push({ interestId: record.id, memberId: record.memberId, error: err.message });
    }
  }

  return {
    period:       period || "all",
    totalRecords: records.length,
    successCount,
    failedCount:  errors.length,
    totalPaidOut: parseFloat(totalPaidOut.toFixed(2)),
    errors,
  };
};

// ─── 11. Get By Member ────────────────────────────────────────────────────────

/**
 * Returns paginated interest records for a specific member.
 * @param {number|string} memberId
 * @param {Object} options — { type, page, limit }
 */
exports.getByMember = async (memberId, { type, page, limit }) => {
  const offset = (page - 1) * limit;

  const member = await Member.findByPk(memberId, {
    attributes: ["id", "firstName", "lastName", "memberNumber"],
  });
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  const where = { memberId };
  if (type !== "all") where.type = type;

  const { count, rows } = await Interest.findAndCountAll({
    where,
    order:  [["createdAt", "DESC"]],
    limit,
    offset,
  });

  const totals = await Interest.findAll({
    where:      { memberId },
    attributes: ["type", [fn("SUM", col("amount")), "total"]],
    group:      ["type"],
    raw:        true,
  });

  return {
    member,
    data: rows,
    totals: totals.reduce((acc, t) => {
      acc[t.type] = parseFloat(t.total) || 0;
      return acc;
    }, {}),
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─── 12. Get By Saving ────────────────────────────────────────────────────────

/**
 * Returns paginated interest history for a saving account.
 * @param {number|string} savingId
 * @param {Object} options — { page, limit }
 */
exports.getBySaving = async (savingId, { page, limit }) => {
  const offset = (page - 1) * limit;

  const saving = await Saving.findByPk(savingId);
  if (!saving) throw Object.assign(new Error("Saving account not found"), { status: 404 });

  const { count, rows } = await Interest.findAndCountAll({
    where:  { savingId },
    order:  [["createdAt", "DESC"]],
    limit,
    offset,
  });

  const totalEarned = await Interest.sum("amount", { where: { savingId, type: "earned" } }) || 0;
  const totalPaid   = await Interest.sum("amount", { where: { savingId, type: "paid"   } }) || 0;

  return {
    saving,
    data: rows,
    totalEarned,
    totalPaid,
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─── 13. Get By Loan ──────────────────────────────────────────────────────────

/**
 * Returns paginated interest history for a loan.
 * @param {number|string} loanId
 * @param {Object} options — { page, limit }
 */
exports.getByLoan = async (loanId, { page, limit }) => {
  const offset = (page - 1) * limit;

  const loan = await Loan.findByPk(loanId);
  if (!loan) throw Object.assign(new Error("Loan not found"), { status: 404 });

  const { count, rows } = await Interest.findAndCountAll({
    where:  { loanId },
    order:  [["createdAt", "DESC"]],
    limit,
    offset,
  });

  const totalCharged = await Interest.sum("amount", { where: { loanId, type: "charged" } }) || 0;

  return {
    loan,
    data: rows,
    totalCharged,
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};


