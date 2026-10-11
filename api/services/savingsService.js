/**
 * api/services/savingsService.js
 */

const { Op }  = require("sequelize");
const sequelize   = require("../config/db");

const Saving      = require("../models/Saving");
const Member      = require("../models/Member");
const Transaction = require("../models/Transaction");

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateAccountNumber() {
  const year   = new Date().getFullYear();
  const suffix = Math.floor(10000 + Math.random() * 90000);
  return `SAV-${year}-${suffix}`;
}

function buildDateFilter(from, to) {
  if (!from && !to) return {};
  const filter = {};
  if (from) filter[Op.gte] = new Date(from);
  if (to)   filter[Op.lte] = new Date(`${to}T23:59:59`);
  return { createdAt: filter };
}

// ─── 1. Get All Savings ───────────────────────────────────────────────────────

exports.getAllSavings = async ({ status, page, limit, search }) => {
  const offset = (page - 1) * limit;

  const savingWhere = {};
  if (status !== "all") savingWhere.status = status;

  const memberWhere = {};
  if (search) {
    memberWhere[Op.or] = [
      { firstName: { [Op.like]: `%${search}%` } },
      { lastName:  { [Op.like]: `%${search}%` } },
    ];
    savingWhere[Op.or] = [
      { accountNumber: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Saving.findAndCountAll({
    where:   savingWhere,
    include: [{
      model:      Member,
      as:         "member",                                          // ✅ FIXED
      attributes: ["id", "firstName", "lastName", "memberNumber", "phone"],
      where:      Object.keys(memberWhere).length ? memberWhere : undefined,
      required:   !!search,
    }],
    order:   [["createdAt", "DESC"]],
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

// ─── 2. Get Saving By ID ──────────────────────────────────────────────────────

exports.getSavingById = async (id) => {
  return Saving.findByPk(id, {
    include: [{
      model:      Member,
      as:         "member",                                          // ✅ FIXED
      attributes: ["id", "firstName", "lastName", "memberNumber", "phone", "email"],
    }],
  });
};

// ─── 3. Create Saving Account ─────────────────────────────────────────────────

exports.createSaving = async (body) => {
  const { memberId, accountType, initialDeposit = 0, interestRate = 0.08 } = body;

  const member = await Member.findByPk(memberId);
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  return sequelize.transaction(async (t) => {
    const saving = await Saving.create({
      memberId,
      accountNumber: generateAccountNumber(),
      accountType,
      balance:       initialDeposit,
      interestRate,
      status:        "active",
    }, { transaction: t });

    if (initialDeposit > 0) {
      await Transaction.create({
        savingId:      saving.id,
        memberId,
        type:          "deposit",
        amount:        initialDeposit,
        balanceAfter:  initialDeposit,
        reference:     `INIT-${saving.accountNumber}`,
        description:   "Initial deposit",
      }, { transaction: t });
    }

    return saving;
  });
};

// ─── 4. Update Saving Account ─────────────────────────────────────────────────

exports.updateSaving = async (id, body) => {
  const saving = await Saving.findByPk(id);
  if (!saving) return null;

  const allowedFields = ["interestRate", "accountType", "status"];
  allowedFields.forEach((field) => {
    if (body[field] !== undefined) saving[field] = body[field];
  });

  await saving.save();
  return saving;
};

// ─── 5. Delete (Close) Saving Account ────────────────────────────────────────

exports.deleteSaving = async (id) => {
  const saving = await Saving.findByPk(id);
  if (!saving) throw Object.assign(new Error("Saving account not found"), { status: 404 });

  if (saving.balance > 0) {
    throw Object.assign(
      new Error("Account balance must be zero before closing. Please withdraw remaining funds first."),
      { status: 400 }
    );
  }

  saving.status = "closed";
  await saving.save();
  return saving;
};

// ─── 6. Deposit ───────────────────────────────────────────────────────────────

exports.deposit = async (id, body) => {
  const { amount, paymentMethod, reference, notes } = body;

  if (!amount || amount <= 0) {
    throw Object.assign(new Error("Deposit amount must be greater than zero"), { status: 400 });
  }

  return sequelize.transaction(async (t) => {
    const saving = await Saving.findByPk(id, {
      lock:        t.LOCK.UPDATE,
      transaction: t,
    });

    if (!saving) throw Object.assign(new Error("Saving account not found"), { status: 404 });
    if (saving.status !== "active") {
      throw Object.assign(new Error("Deposits can only be made to active accounts"), { status: 400 });
    }

    saving.balance = parseFloat(saving.balance) + parseFloat(amount);
    await saving.save({ transaction: t });

    const tx = await Transaction.create({
      savingId:      saving.id,
      memberId:      saving.memberId,
      type:          "deposit",
      amount:        parseFloat(amount),
      balanceAfter:  saving.balance,
      paymentMethod: paymentMethod || "cash",
      reference:     reference || null,
      description:   notes || "Deposit",
    }, { transaction: t });

    return { transaction: tx, newBalance: saving.balance };
  });
};

// ─── 7. Withdraw ──────────────────────────────────────────────────────────────

exports.withdraw = async (id, body) => {
  const { amount, paymentMethod, reference, notes } = body;

  if (!amount || amount <= 0) {
    throw Object.assign(new Error("Withdrawal amount must be greater than zero"), { status: 400 });
  }

  return sequelize.transaction(async (t) => {
    const saving = await Saving.findByPk(id, {
      lock:        t.LOCK.UPDATE,
      transaction: t,
    });

    if (!saving) throw Object.assign(new Error("Saving account not found"), { status: 404 });
    if (saving.status !== "active") {
      throw Object.assign(new Error("Withdrawals can only be made from active accounts"), { status: 400 });
    }
    if (parseFloat(saving.balance) < parseFloat(amount)) {
      throw Object.assign(
        new Error(`Insufficient balance. Available: ${saving.balance}, Requested: ${amount}`),
        { status: 400 }
      );
    }

    saving.balance = parseFloat(saving.balance) - parseFloat(amount);
    await saving.save({ transaction: t });

    const tx = await Transaction.create({
      savingId:      saving.id,
      memberId:      saving.memberId,
      type:          "withdrawal",
      amount:        parseFloat(amount),
      balanceAfter:  saving.balance,
      paymentMethod: paymentMethod || "cash",
      reference:     reference || null,
      description:   notes || "Withdrawal",
    }, { transaction: t });

    return { transaction: tx, newBalance: saving.balance };
  });
};

// ─── 8. Get Transactions ──────────────────────────────────────────────────────

exports.getTransactions = async (id, { type, from, to, page, limit }) => {
  const offset = (page - 1) * limit;

  const where = { savingId: id, ...buildDateFilter(from, to) };
  if (type !== "all") where.type = type;

  const { count, rows } = await Transaction.findAndCountAll({
    where,
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

// ─── 9. Get Statement ─────────────────────────────────────────────────────────

exports.getStatement = async (id, { from, to }) => {
  const saving = await Saving.findByPk(id, {
    include: [{
      model:      Member,
      as:         "member",                                          // ✅ FIXED
      attributes: ["id", "firstName", "lastName", "memberNumber", "phone", "email"],
    }],
  });

  if (!saving) throw Object.assign(new Error("Saving account not found"), { status: 404 });

  const transactions = await Transaction.findAll({
    where: { savingId: id, ...buildDateFilter(from, to) },
    order: [["createdAt", "ASC"]],
  });

  const openingBalance = transactions.length > 0
    ? transactions[0].balanceAfter - transactions[0].amount *
      (transactions[0].type === "withdrawal" ? -1 : 1)
    : saving.balance;

  const totalDeposits = transactions
    .filter((t) => t.type === "deposit")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  const totalWithdrawals = transactions
    .filter((t) => t.type === "withdrawal")
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);

  return {
    account:        saving,
    period:         { from, to },
    openingBalance,
    closingBalance: saving.balance,
    totalDeposits,
    totalWithdrawals,
    netChange:      totalDeposits - totalWithdrawals,
    transactions,
  };
};

// ─── 10. Get Savings By Member ────────────────────────────────────────────────

exports.getSavingsByMember = async (memberId) => {
  const member = await Member.findByPk(memberId, {
    attributes: ["id", "firstName", "lastName", "memberNumber"],
  });
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  const savings = await Saving.findAll({
    where: { memberId },
    order: [["createdAt", "DESC"]],
  });

  const totalBalance = savings.reduce((sum, s) => sum + parseFloat(s.balance), 0);

  return { member, savings, totalBalance };
};