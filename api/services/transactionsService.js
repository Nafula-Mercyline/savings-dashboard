/**
 * api/services/transactionsService.js
 *
 * All business logic for transaction management.
 * Uses Sequelize ORM.
 *
 * Models expected: Transaction, Member, Saving, Loan
 */

const { Op, fn, col } = require("sequelize");
const sequelize   = require("../config/db");

const Transaction = require("../models/Transaction");
const Member      = require("../models/Member");
const Saving      = require("../models/Saving");
const Loan        = require("../models/Loan");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a Sequelize createdAt filter from optional from/to strings.
 */
function buildDateFilter(from, to) {
  if (!from && !to) return {};
  const filter = {};
  if (from) filter[Op.gte] = new Date(from);
  if (to)   filter[Op.lte] = new Date(`${to}T23:59:59`);
  return { createdAt: filter };
}

/**
 * Returns { start, end } for a named period.
 */
function getPeriodRange(period, from, to) {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = now.getMonth();
  const d   = now.getDate();

  switch (period) {
    case "today":
      return { start: new Date(y, m, d, 0, 0, 0), end: now };
    case "this_week": {
      const day   = now.getDay();
      const start = new Date(y, m, d - day, 0, 0, 0);
      return { start, end: now };
    }
    case "last_month":
      return {
        start: new Date(y, m - 1, 1),
        end:   new Date(y, m, 0, 23, 59, 59),
      };
    case "ytd":
      return { start: new Date(y, 0, 1), end: now };
    case "custom":
      if (!from || !to) throw Object.assign(
        new Error("from and to are required for custom period"),
        { status: 400 }
      );
      return { start: new Date(from), end: new Date(`${to}T23:59:59`) };
    case "this_month":
    default:
      return { start: new Date(y, m, 1), end: now };
  }
}

/**
 * Generates a unique transaction reference e.g. TXN-2026-00042
 */
function generateReference() {
  const year   = new Date().getFullYear();
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `TXN-${year}-${suffix}`;
}

/**
 * Converts an array of transaction objects to CSV string.
 */
function toCSV(transactions) {
  const headers = [
    "Reference", "Date", "Type", "Amount",
    "Member", "Member Number", "Payment Method",
    "Description", "Status",
  ];

  const rows = transactions.map((t) => [
    t.reference,
    new Date(t.createdAt).toISOString().split("T")[0],
    t.type,
    t.amount,
    t.Member ? `${t.Member.firstName} ${t.Member.lastName}` : "",
    t.Member ? t.Member.memberNumber : "",
    t.paymentMethod || "",
    (t.description  || "").replace(/,/g, ";"),
    t.status,
  ]);

  return [headers, ...rows]
    .map((row) => row.join(","))
    .join("\n");
}

// ─── 1. Get All Transactions ──────────────────────────────────────────────────

/**
 * Returns paginated list of all transactions.
 * @param {Object} options
 * @param {string} options.type    — transaction type or "all"
 * @param {string} options.status  — "completed" | "reversed" | "pending" | "all"
 * @param {string} options.from    — YYYY-MM-DD
 * @param {string} options.to      — YYYY-MM-DD
 * @param {number} options.page
 * @param {number} options.limit
 * @param {string} options.search  — member name or reference
 */
exports.getAllTransactions = async ({ type, status, from, to, page, limit, search }) => {
  const offset = (page - 1) * limit;
  const where  = { ...buildDateFilter(from, to) };

  if (type   !== "all") where.type   = type;
  if (status !== "all") where.status = status;
  if (search) where.reference = { [Op.like]: `%${search}%` };

  const memberWhere = {};
  if (search) {
    memberWhere[Op.or] = [
      { firstName: { [Op.like]: `%${search}%` } },
      { lastName:  { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Transaction.findAndCountAll({
    where,
    include: [{
      model:      Member,
      attributes: ["id", "firstName", "lastName", "memberNumber"],
      where:      Object.keys(memberWhere).length ? memberWhere : undefined,
      required:   false,
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

// ─── 2. Get Transaction By ID ─────────────────────────────────────────────────

exports.getTransactionById = async (id) => {
  return Transaction.findByPk(id, {
    include: [
      {
        model:      Member,
        attributes: ["id", "firstName", "lastName", "memberNumber", "phone"],
      },
      {
        model:      Saving,
        attributes: ["id", "accountNumber", "accountType", "balance"],
        required:   false,
      },
      {
        model:      Loan,
        attributes: ["id", "reference", "principal", "balance", "status"],
        required:   false,
      },
    ],
  });
};

// ─── 3. Create Transaction (manual) ──────────────────────────────────────────

/**
 * Manually creates a transaction and updates the related account balance.
 * Used for adjustments and corrections.
 *
 * @param {Object} body
 * @param {number} body.memberId
 * @param {string} body.type          — "deposit" | "withdrawal" | "adjustment"
 * @param {number} body.amount
 * @param {number} body.savingId      — optional
 * @param {number} body.loanId        — optional
 * @param {string} body.paymentMethod — optional
 * @param {string} body.reference     — optional (auto-generated if omitted)
 * @param {string} body.description   — optional
 */
exports.createTransaction = async (body) => {
  const {
    memberId, type, amount, savingId,
    loanId, paymentMethod, reference, description,
  } = body;

  const member = await Member.findByPk(memberId);
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  return sequelize.transaction(async (t) => {
    // If linked to a saving account, update its balance
    if (savingId) {
      const saving = await Saving.findByPk(savingId, {
        lock:        t.LOCK.UPDATE,
        transaction: t,
      });
      if (!saving) throw Object.assign(new Error("Saving account not found"), { status: 404 });

      if (type === "deposit" || type === "adjustment") {
        saving.balance = parseFloat(saving.balance) + parseFloat(amount);
      } else if (type === "withdrawal") {
        if (parseFloat(saving.balance) < parseFloat(amount)) {
          throw Object.assign(new Error("Insufficient saving balance"), { status: 400 });
        }
        saving.balance = parseFloat(saving.balance) - parseFloat(amount);
      }
      await saving.save({ transaction: t });
    }

    const tx = await Transaction.create({
      memberId,
      savingId:      savingId      || null,
      loanId:        loanId        || null,
      type,
      amount:        parseFloat(amount),
      paymentMethod: paymentMethod || "cash",
      reference:     reference     || generateReference(),
      description:   description   || "Manual transaction",
      status:        "completed",
      source:        "manual",
    }, { transaction: t });

    return tx;
  });
};

// ─── 4. Reverse Transaction ───────────────────────────────────────────────────

/**
 * Reverses a transaction by:
 *   1. Marking original as "reversed"
 *   2. Creating a compensating opposite entry
 *   3. Restoring the saving account balance if applicable
 *
 * @param {number|string} id
 * @param {Object} options — { reason }
 */
exports.reverseTransaction = async (id, { reason }) => {
  const original = await Transaction.findByPk(id, {
    include: [{ model: Saving, required: false }],
  });

  if (!original) throw Object.assign(new Error("Transaction not found"), { status: 404 });

  if (original.status === "reversed") {
    throw Object.assign(new Error("Transaction has already been reversed"), { status: 400 });
  }

  const blockedTypes = ["loan_disbursement"];
  if (blockedTypes.includes(original.type)) {
    throw Object.assign(
      new Error(`Transactions of type "${original.type}" cannot be reversed here. Use the loans module.`),
      { status: 400 }
    );
  }

  return sequelize.transaction(async (t) => {
    // Restore saving balance
    if (original.savingId) {
      const saving = await Saving.findByPk(original.savingId, {
        lock:        t.LOCK.UPDATE,
        transaction: t,
      });
      if (saving) {
        if (original.type === "deposit" || original.type === "interest_credit") {
          if (parseFloat(saving.balance) < parseFloat(original.amount)) {
            throw Object.assign(
              new Error("Cannot reverse: current balance is lower than the transaction amount"),
              { status: 400 }
            );
          }
          saving.balance = parseFloat(saving.balance) - parseFloat(original.amount);
        } else if (original.type === "withdrawal") {
          saving.balance = parseFloat(saving.balance) + parseFloat(original.amount);
        }
        await saving.save({ transaction: t });
      }
    }

    // Mark original as reversed
    original.status        = "reversed";
    original.reversalReason = reason;
    original.reversedAt    = new Date();
    await original.save({ transaction: t });

    // Create compensating entry
    const reversal = await Transaction.create({
      memberId:      original.memberId,
      savingId:      original.savingId || null,
      loanId:        original.loanId   || null,
      type:          "reversal",
      amount:        original.amount,
      paymentMethod: original.paymentMethod,
      reference:     `REV-${original.reference}`,
      description:   `Reversal of ${original.reference} — ${reason}`,
      status:        "completed",
      source:        "manual",
      reversalOf:    original.id,
    }, { transaction: t });

    return { original, reversal };
  });
};

// ─── 5. Get Summary ───────────────────────────────────────────────────────────

/**
 * Returns transaction totals grouped by type for a period.
 * @param {Object} options — { period, from, to }
 */
exports.getSummary = async ({ period, from, to }) => {
  const range = getPeriodRange(period, from, to);
  const where = { createdAt: { [Op.between]: [range.start, range.end] }, status: "completed" };

  // Aggregate by type
  const byType = await Transaction.findAll({
    where,
    attributes: [
      "type",
      [fn("COUNT", col("id")),     "count" ],
      [fn("SUM",   col("amount")), "total" ],
    ],
    group: ["type"],
    raw:   true,
  });

  // Daily volume for sparkline
  const daily = await Transaction.findAll({
    where,
    attributes: [
      [fn("DATE", col("createdAt")), "date"],
      [fn("SUM",  col("amount")),   "total"],
      [fn("COUNT", col("id")),      "count"],
    ],
    group: [fn("DATE", col("createdAt"))],
    order: [[fn("DATE", col("createdAt")), "ASC"]],
    raw:   true,
  });

  const summary = byType.reduce((acc, row) => {
    acc[row.type] = {
      count: parseInt(row.count),
      total: parseFloat(row.total) || 0,
    };
    return acc;
  }, {});

  const grandTotal = byType.reduce((s, row) => s + (parseFloat(row.total) || 0), 0);

  return {
    period,
    range:      { from: range.start, to: range.end },
    byType:     summary,
    grandTotal: parseFloat(grandTotal.toFixed(2)),
    daily,
  };
};

// ─── 6. Export Transactions ───────────────────────────────────────────────────

/**
 * Exports transactions as CSV for a date range.
 * Excel support requires the xlsx package — falls back to CSV.
 *
 * @param {Object} options — { from, to, type, format }
 */
exports.exportTransactions = async ({ from, to, type, format }) => {
  const where = { ...buildDateFilter(from, to), status: "completed" };
  if (type !== "all") where.type = type;

  const transactions = await Transaction.findAll({
    where,
    include: [{
      model:      Member,
      attributes: ["id", "firstName", "lastName", "memberNumber"],
    }],
    order: [["createdAt", "ASC"]],
  });

  const dateLabel = `${from}_to_${to}`;

  if (format === "excel") {
    // Requires: npm install xlsx
    try {
      const XLSX      = require("xlsx");
      const wsData    = transactions.map((t) => ({
        Reference:      t.reference,
        Date:           new Date(t.createdAt).toISOString().split("T")[0],
        Type:           t.type,
        Amount:         parseFloat(t.amount),
        Member:         t.Member ? `${t.Member.firstName} ${t.Member.lastName}` : "",
        "Member No.":   t.Member ? t.Member.memberNumber : "",
        "Payment Method": t.paymentMethod || "",
        Description:    t.description || "",
        Status:         t.status,
      }));
      const ws  = XLSX.utils.json_to_sheet(wsData);
      const wb  = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transactions");
      const content = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return {
        content,
        filename:    `transactions_${dateLabel}.xlsx`,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    } catch {
      // xlsx not installed — fall through to CSV
    }
  }

  // Default: CSV
  const content = toCSV(transactions.map((t) => t.toJSON()));
  return {
    content,
    filename:    `transactions_${dateLabel}.csv`,
    contentType: "text/csv",
  };
};

// ─── 7. Get Recent Transactions ───────────────────────────────────────────────

/**
 * Returns the latest N transactions — for the dashboard live feed.
 * @param {Object} options — { limit, type }
 */
exports.getRecent = async ({ limit, type }) => {
  const where = { status: "completed" };
  if (type !== "all") where.type = type;

  return Transaction.findAll({
    where,
    include: [{
      model:      Member,
      attributes: ["id", "firstName", "lastName", "memberNumber"],
    }],
    order: [["createdAt", "DESC"]],
    limit,
  });
};

// ─── 8. Get By Member ────────────────────────────────────────────────────────

/**
 * Returns paginated transactions for a member.
 * @param {number|string} memberId
 * @param {Object} options — { type, from, to, page, limit }
 */
exports.getByMember = async (memberId, { type, from, to, page, limit }) => {
  const member = await Member.findByPk(memberId, {
    attributes: ["id", "firstName", "lastName", "memberNumber"],
  });
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  const offset = (page - 1) * limit;
  const where  = { memberId, ...buildDateFilter(from, to) };
  if (type !== "all") where.type = type;

  const { count, rows } = await Transaction.findAndCountAll({
    where,
    order:  [["createdAt", "DESC"]],
    limit,
    offset,
  });

  // Running totals
  const [totalIn, totalOut] = await Promise.all([
    Transaction.sum("amount", {
      where: { memberId, type: { [Op.in]: ["deposit", "interest_credit"] }, status: "completed" },
    }),
    Transaction.sum("amount", {
      where: { memberId, type: { [Op.in]: ["withdrawal", "loan_repayment"] }, status: "completed" },
    }),
  ]);

  return {
    member,
    data: rows,
    totals: {
      in:  totalIn  || 0,
      out: totalOut || 0,
      net: (totalIn || 0) - (totalOut || 0),
    },
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─── 9. Get By Saving ─────────────────────────────────────────────────────────

/**
 * Returns paginated transactions for a saving account.
 * @param {number|string} savingId
 * @param {Object} options — { type, from, to, page, limit }
 */
exports.getBySaving = async (savingId, { type, from, to, page, limit }) => {
  const saving = await Saving.findByPk(savingId, {
    attributes: ["id", "accountNumber", "accountType", "balance"],
  });
  if (!saving) throw Object.assign(new Error("Saving account not found"), { status: 404 });

  const offset = (page - 1) * limit;
  const where  = { savingId, ...buildDateFilter(from, to) };
  if (type !== "all") where.type = type;

  const { count, rows } = await Transaction.findAndCountAll({
    where,
    order:  [["createdAt", "DESC"]],
    limit,
    offset,
  });

  const [totalDeposits, totalWithdrawals] = await Promise.all([
    Transaction.sum("amount", { where: { savingId, type: "deposit",    status: "completed" } }),
    Transaction.sum("amount", { where: { savingId, type: "withdrawal", status: "completed" } }),
  ]);

  return {
    saving,
    data: rows,
    totals: {
      deposits:    totalDeposits    || 0,
      withdrawals: totalWithdrawals || 0,
      net:         (totalDeposits || 0) - (totalWithdrawals || 0),
    },
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─── 10. Get By Loan ──────────────────────────────────────────────────────────

/**
 * Returns paginated transactions for a loan.
 * @param {number|string} loanId
 * @param {Object} options — { page, limit }
 */
exports.getByLoan = async (loanId, { page, limit }) => {
  const loan = await Loan.findByPk(loanId, {
    attributes: ["id", "reference", "principal", "balance", "status"],
  });
  if (!loan) throw Object.assign(new Error("Loan not found"), { status: 404 });

  const offset = (page - 1) * limit;

  const { count, rows } = await Transaction.findAndCountAll({
    where:  { loanId },
    order:  [["createdAt", "DESC"]],
    limit,
    offset,
  });

  const totalRepaid = await Transaction.sum("amount", {
    where: { loanId, type: "loan_repayment", status: "completed" },
  });

  return {
    loan,
    data: rows,
    totalRepaid: totalRepaid || 0,
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};


