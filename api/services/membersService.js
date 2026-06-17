/**
 * api/services/membersService.js
 *
 * All business logic for member management.
 * Uses Sequelize ORM.
 *
 * Models expected: Member, Saving, Loan, Transaction, Interest
 */

const { Op, fn, col } = require("sequelize");

const Member      = require("../models/Member");
const Saving      = require("../models/Saving");
const Loan        = require("../models/Loan");
const Transaction = require("../models/Transaction");
const Interest    = require("../models/Interest");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a unique member number e.g. MBR-2026-00042
 */
async function generateMemberNumber() {
  const year  = new Date().getFullYear();
  const count = await Member.count();
  const seq   = String(count + 1).padStart(5, "0");
  return `MBR-${year}-${seq}`;
}

/**
 * Builds a date range where clause from optional from/to strings.
 */
function buildDateFilter(from, to) {
  if (!from && !to) return {};
  const filter = {};
  if (from) filter[Op.gte] = new Date(from);
  if (to)   filter[Op.lte] = new Date(`${to}T23:59:59`);
  return { createdAt: filter };
}

/**
 * Maps sortBy param to a valid Sequelize column.
 */
function resolveSort(sortBy) {
  const map = {
    name:      "firstName",
    createdAt: "createdAt",
    balance:   "createdAt", // balance sort handled separately
  };
  return map[sortBy] || "createdAt";
}

// ─── 1. Get All Members ───────────────────────────────────────────────────────

/**
 * Returns paginated list of all members with basic savings summary.
 * @param {Object} options
 * @param {string} options.status  — "active" | "inactive" | "all"
 * @param {number} options.page
 * @param {number} options.limit
 * @param {string} options.search  — name, email, phone, memberNumber
 * @param {string} options.sortBy  — "name" | "createdAt"
 * @param {string} options.order   — "ASC" | "DESC"
 */
exports.getAllMembers = async ({ status, page, limit, search, sortBy, order }) => {
  const offset = (page - 1) * limit;

  const where = {};
  if (status !== "all") where.status = status;

  if (search) {
    where[Op.or] = [
      { firstName:    { [Op.like]: `%${search}%` } },
      { lastName:     { [Op.like]: `%${search}%` } },
      { email:        { [Op.like]: `%${search}%` } },
      { phone:        { [Op.like]: `%${search}%` } },
      { memberNumber: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Member.findAndCountAll({
    where,
    order:  [[resolveSort(sortBy), order]],
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

// ─── 2. Get Member By ID ──────────────────────────────────────────────────────

/**
 * Returns a single member with savings and loan summary counts.
 * @param {number|string} id
 */
exports.getMemberById = async (id) => {
  const member = await Member.findByPk(id);
  if (!member) return null;

  const [totalSavings, activeLoans, totalTransactions] = await Promise.all([
    Saving.sum("balance",   { where: { memberId: id, status: "active" } }),
    Loan.count(             { where: { memberId: id, status: "active" } }),
    Transaction.count(      { where: { memberId: id } }),
  ]);

  return {
    ...member.toJSON(),
    summary: {
      totalSavings:      totalSavings      || 0,
      activeLoans:       activeLoans       || 0,
      totalTransactions: totalTransactions || 0,
    },
  };
};

// ─── 3. Create Member ─────────────────────────────────────────────────────────

/**
 * Registers a new member.
 * Auto-generates memberNumber.
 * Blocks duplicate email, phone, or nationalId.
 *
 * @param {Object} body
 * @param {string} body.firstName
 * @param {string} body.lastName
 * @param {string} body.email
 * @param {string} body.phone
 * @param {string} body.nationalId
 * @param {string} body.dateOfBirth   — YYYY-MM-DD
 * @param {string} body.gender        — "male" | "female" | "other"
 * @param {string} body.address
 * @param {string} body.nextOfKin
 * @param {string} body.nextOfKinPhone
 * @param {string} body.occupation
 * @param {string} body.joinedAt      — YYYY-MM-DD (default: today)
 */
exports.createMember = async (body) => {
  const {
    firstName, lastName, email, phone, nationalId,
    dateOfBirth, gender, address, nextOfKin,
    nextOfKinPhone, occupation, joinedAt,
  } = body;

  // Duplicate checks
  const existing = await Member.findOne({
    where: {
      [Op.or]: [
        { email      },
        { phone      },
        { nationalId },
      ],
    },
  });

  if (existing) {
    const field =
      existing.email      === email      ? "email" :
      existing.phone      === phone      ? "phone" :
      "national ID";
    throw Object.assign(
      new Error(`A member with this ${field} already exists`),
      { status: 409 }
    );
  }

  const memberNumber = await generateMemberNumber();

  return Member.create({
    memberNumber,
    firstName,
    lastName,
    email,
    phone,
    nationalId,
    dateOfBirth: dateOfBirth || null,
    gender:      gender      || null,
    address:     address     || null,
    nextOfKin:      nextOfKin      || null,
    nextOfKinPhone: nextOfKinPhone || null,
    occupation:  occupation  || null,
    joinedAt:    joinedAt ? new Date(joinedAt) : new Date(),
    status:      "active",
  });
};

// ─── 4. Update Member ─────────────────────────────────────────────────────────

/**
 * Updates allowed personal fields on a member.
 * @param {number|string} id
 * @param {Object} body
 */
exports.updateMember = async (id, body) => {
  const member = await Member.findByPk(id);
  if (!member) return null;

  const allowedFields = [
    "firstName", "lastName", "email", "phone", "address",
    "dateOfBirth", "gender", "nextOfKin", "nextOfKinPhone", "occupation",
  ];

  allowedFields.forEach((field) => {
    if (body[field] !== undefined) member[field] = body[field];
  });

  await member.save();
  return member;
};

// ─── 5. Delete (Deactivate) Member ───────────────────────────────────────────

/**
 * Soft-deletes a member by setting status to "inactive".
 * Blocked if member has an active loan or positive saving balance.
 * @param {number|string} id
 */
exports.deleteMember = async (id) => {
  const member = await Member.findByPk(id);
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  const [activeLoans, savingsBalance] = await Promise.all([
    Loan.count(  { where: { memberId: id, status: "active" } }),
    Saving.sum("balance", { where: { memberId: id, status: "active" } }),
  ]);

  if (activeLoans > 0) {
    throw Object.assign(
      new Error("Member has active loans. Please close all loans before deactivating."),
      { status: 400 }
    );
  }
  if ((savingsBalance || 0) > 0) {
    throw Object.assign(
      new Error("Member has a positive saving balance. Please withdraw all funds before deactivating."),
      { status: 400 }
    );
  }

  member.status = "inactive";
  await member.save();
  return member;
};

// ─── 6. Get Full Member Profile ───────────────────────────────────────────────

/**
 * Returns a 360° member profile:
 * personal info, savings summary, loan summary,
 * recent transactions, interest totals.
 * @param {number|string} id
 */
exports.getMemberProfile = async (id) => {
  const member = await Member.findByPk(id);
  if (!member) return null;

  const [
    savings,
    loans,
    recentTransactions,
    interestEarned,
    interestCharged,
  ] = await Promise.all([
    Saving.findAll({ where: { memberId: id }, order: [["createdAt", "DESC"]] }),
    Loan.findAll({   where: { memberId: id }, order: [["createdAt", "DESC"]] }),
    Transaction.findAll({
      where: { memberId: id },
      order: [["createdAt", "DESC"]],
      limit: 5,
    }),
    Interest.sum("amount", { where: { memberId: id, type: "earned"  } }),
    Interest.sum("amount", { where: { memberId: id, type: "charged" } }),
  ]);

  const totalSavingsBalance  = savings
    .filter((s) => s.status === "active")
    .reduce((sum, s) => sum + parseFloat(s.balance), 0);

  const totalLoanBalance     = loans
    .filter((l) => l.status === "active")
    .reduce((sum, l) => sum + parseFloat(l.balance), 0);

  return {
    member,
    savings: {
      accounts:     savings,
      totalBalance: totalSavingsBalance,
      count:        savings.length,
    },
    loans: {
      list:              loans,
      totalOutstanding:  totalLoanBalance,
      activeCount:       loans.filter((l) => l.status === "active").length,
      pendingCount:      loans.filter((l) => l.status === "pending").length,
    },
    recentTransactions,
    interest: {
      totalEarned:  interestEarned  || 0,
      totalCharged: interestCharged || 0,
      net:          (interestEarned || 0) - (interestCharged || 0),
    },
  };
};

// ─── 7. Get Member Savings ────────────────────────────────────────────────────

exports.getMemberSavings = async (id) => {
  const member = await Member.findByPk(id, {
    attributes: ["id", "firstName", "lastName", "memberNumber"],
  });
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  const savings      = await Saving.findAll({ where: { memberId: id }, order: [["createdAt", "DESC"]] });
  const totalBalance = savings.reduce((s, a) => s + parseFloat(a.balance), 0);

  return { member, savings, totalBalance };
};

// ─── 8. Get Member Loans ──────────────────────────────────────────────────────

exports.getMemberLoans = async (id, { status }) => {
  const member = await Member.findByPk(id, {
    attributes: ["id", "firstName", "lastName", "memberNumber"],
  });
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  const where = { memberId: id };
  if (status !== "all") where.status = status;

  const loans            = await Loan.findAll({ where, order: [["createdAt", "DESC"]] });
  const totalBorrowed    = loans.reduce((s, l) => s + parseFloat(l.principal), 0);
  const totalOutstanding = loans
    .filter((l) => l.status === "active")
    .reduce((s, l) => s + parseFloat(l.balance), 0);

  return { member, loans, totalBorrowed, totalOutstanding };
};

// ─── 9. Get Member Transactions ───────────────────────────────────────────────

exports.getMemberTransactions = async (id, { type, from, to, page, limit }) => {
  const offset = (page - 1) * limit;
  const where  = { memberId: id, ...buildDateFilter(from, to) };
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

// ─── 10. Get Member Interest ──────────────────────────────────────────────────

exports.getMemberInterest = async (id, { type, page, limit }) => {
  const offset = (page - 1) * limit;
  const where  = { memberId: id };
  if (type !== "all") where.type = type;

  const { count, rows } = await Interest.findAndCountAll({
    where,
    order:  [["createdAt", "DESC"]],
    limit,
    offset,
  });

  const [earned, charged, paid] = await Promise.all([
    Interest.sum("amount", { where: { memberId: id, type: "earned"  } }),
    Interest.sum("amount", { where: { memberId: id, type: "charged" } }),
    Interest.sum("amount", { where: { memberId: id, type: "paid"    } }),
  ]);

  return {
    data: rows,
    totals: {
      earned:  earned  || 0,
      charged: charged || 0,
      paid:    paid    || 0,
      net:     (earned || 0) - (paid || 0),
    },
    pagination: {
      total:      count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
};

// ─── 11. Get Member Statement ─────────────────────────────────────────────────

/**
 * Full financial statement for a member over a date range.
 * Includes all transactions, savings balances, and loan activity.
 * @param {number|string} id
 * @param {Object} options — { from, to }
 */
exports.getMemberStatement = async (id, { from, to }) => {
  const member = await Member.findByPk(id);
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  const dateFilter = buildDateFilter(from, to);

  const [savings, loans, transactions, interestEarned, interestCharged] = await Promise.all([
    Saving.findAll({      where: { memberId: id },               order: [["createdAt", "ASC"]] }),
    Loan.findAll({        where: { memberId: id },               order: [["createdAt", "ASC"]] }),
    Transaction.findAll({ where: { memberId: id, ...dateFilter }, order: [["createdAt", "ASC"]] }),
    Interest.sum("amount", { where: { memberId: id, type: "earned",  ...dateFilter } }),
    Interest.sum("amount", { where: { memberId: id, type: "charged", ...dateFilter } }),
  ]);

  const totalDeposits = transactions
    .filter((t) => t.type === "deposit")
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const totalWithdrawals = transactions
    .filter((t) => t.type === "withdrawal")
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  const totalRepayments = transactions
    .filter((t) => t.type === "loan_repayment")
    .reduce((s, t) => s + parseFloat(t.amount), 0);

  return {
    member,
    period:          { from, to },
    savings,
    loans,
    transactions,
    summary: {
      totalDeposits,
      totalWithdrawals,
      totalRepayments,
      interestEarned:  interestEarned  || 0,
      interestCharged: interestCharged || 0,
      netCashFlow:     totalDeposits - totalWithdrawals,
    },
  };
};

// ─── 12. Activate Member ──────────────────────────────────────────────────────

exports.activateMember = async (id, body) => {
  const member = await Member.findByPk(id);
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  if (member.status === "active") {
    throw Object.assign(new Error("Member is already active"), { status: 400 });
  }

  member.status     = "active";
  member.statusNote = body.notes || null;
  await member.save();
  return member;
};

// ─── 13. Deactivate Member ────────────────────────────────────────────────────

exports.deactivateMember = async (id, body) => {
  const member = await Member.findByPk(id);
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  if (!body.reason) {
    throw Object.assign(new Error("A reason is required to deactivate a member"), { status: 400 });
  }
  if (member.status === "inactive") {
    throw Object.assign(new Error("Member is already inactive"), { status: 400 });
  }

  member.status     = "inactive";
  member.statusNote = body.reason;
  await member.save();
  return member;
};

// ─── 14. Update Avatar ────────────────────────────────────────────────────────

exports.updateAvatar = async (id, avatarUrl) => {
  const member = await Member.findByPk(id);
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  if (!avatarUrl) throw Object.assign(new Error("avatarUrl is required"), { status: 400 });

  member.avatarUrl = avatarUrl;
  await member.save();
  return member;
};

// ─── 15. Search Members ───────────────────────────────────────────────────────

/**
 * Fast type-ahead search across all identifiable fields.
 * @param {Object} options — { q, status, limit }
 */
exports.searchMembers = async ({ q, status, limit }) => {
  const where = {
    [Op.or]: [
      { firstName:    { [Op.like]: `%${q}%` } },
      { lastName:     { [Op.like]: `%${q}%` } },
      { email:        { [Op.like]: `%${q}%` } },
      { phone:        { [Op.like]: `%${q}%` } },
      { memberNumber: { [Op.like]: `%${q}%` } },
      { nationalId:   { [Op.like]: `%${q}%` } },
    ],
  };
  if (status !== "all") where.status = status;

  return Member.findAll({ where, limit, order: [["firstName", "ASC"]] });
};

// ─── 16. Get Member Stats ─────────────────────────────────────────────────────

/**
 * Returns aggregate membership statistics for the dashboard.
 */
exports.getMemberStats = async () => {
  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    total,
    active,
    inactive,
    newThisMonth,
    withActiveLoans,
    topSavers,
  ] = await Promise.all([
    Member.count(),
    Member.count({ where: { status: "active"   } }),
    Member.count({ where: { status: "inactive" } }),
    Member.count({ where: { createdAt: { [Op.gte]: monthStart } } }),

    // Members with at least one active loan
    Loan.count({
      distinct: true,
      col:      "memberId",
      where:    { status: "active" },
    }),

    // Top 5 members by total savings balance
    Saving.findAll({
      attributes: ["memberId", [fn("SUM", col("balance")), "totalBalance"]],
      where:      { status: "active" },
      group:      ["memberId", "Member.id", "Member.firstName", "Member.lastName", "Member.memberNumber"],
      order:      [[fn("SUM", col("balance")), "DESC"]],
      limit:      5,
      include:    [{
        model:      Member,
        attributes: ["id", "firstName", "lastName", "memberNumber"],
      }],
      raw:  true,
      nest: true,
    }),
  ]);

  return {
    total,
    active,
    inactive,
    newThisMonth,
    withActiveLoans,
    topSavers: topSavers.map((s) => ({
      memberId:     s.memberId,
      name:         `${s.Member.firstName} ${s.Member.lastName}`,
      memberNumber: s.Member.memberNumber,
      totalBalance: parseFloat(s.totalBalance) || 0,
    })),
  };
};


