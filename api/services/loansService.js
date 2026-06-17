/**
 * api/services/loansService.js
 *
 * All business logic for loan management.
 * Uses Sequelize ORM — swap queries for Mongoose/Knex as needed.
 *
 * Models expected: Loan, Member, Repayment, Transaction
 */

const { Op }  = require("sequelize");
const sequelize   = require("../config/db");

const Loan        = require("../models/Loan");
const Member      = require("../models/Member");
const Repayment   = require("../models/LoanRepayment");
const Transaction = require("../models/Transaction");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a unique loan reference e.g. LN-2026-00042 */
function generateLoanReference() {
  const year   = new Date().getFullYear();
  const suffix = Math.floor(10000 + Math.random() * 90000);
  return `LN-${year}-${suffix}`;
}

/** Builds a date range filter from optional from/to strings (YYYY-MM-DD) */
function buildDateFilter(from, to) {
  if (!from && !to) return {};
  const filter = {};
  if (from) filter[Op.gte] = new Date(from);
  if (to)   filter[Op.lte] = new Date(`${to}T23:59:59`);
  return { createdAt: filter };
}

/**
 * Calculates flat-rate monthly instalment.
 * Total interest = principal × rate × termMonths
 * Monthly payment = (principal + totalInterest) / termMonths
 *
 * @param {number} principal
 * @param {number} annualRate  — decimal e.g. 0.12 for 12%
 * @param {number} termMonths
 * @returns {{ monthlyPayment, totalInterest, totalPayable }}
 */
function calcLoanTerms(principal, annualRate, termMonths) {
  const monthlyRate   = annualRate / 12;
  const totalInterest = principal * monthlyRate * termMonths;
  const totalPayable  = principal + totalInterest;
  const monthlyPayment = totalPayable / termMonths;

  return {
    monthlyPayment: parseFloat(monthlyPayment.toFixed(2)),
    totalInterest:  parseFloat(totalInterest.toFixed(2)),
    totalPayable:   parseFloat(totalPayable.toFixed(2)),
  };
}

/**
 * Builds a full amortised repayment schedule array.
 * Each entry: { installmentNo, dueDate, principal, interest, total, balance }
 *
 * @param {number} principal
 * @param {number} annualRate
 * @param {number} termMonths
 * @param {Date}   startDate
 */
function buildSchedule(principal, annualRate, termMonths, startDate) {
  const monthlyRate    = annualRate / 12;
  const { monthlyPayment, totalPayable } = calcLoanTerms(principal, annualRate, termMonths);
  const interestPerInstalment = parseFloat((principal * monthlyRate).toFixed(2));
  const principalPerInstalment = parseFloat((monthlyPayment - interestPerInstalment).toFixed(2));

  let balance  = totalPayable;
  const schedule = [];

  for (let i = 1; i <= termMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const isLast       = i === termMonths;
    const installPrincipal = isLast
      ? parseFloat((balance - interestPerInstalment).toFixed(2))
      : principalPerInstalment;
    const installTotal = isLast
      ? parseFloat(balance.toFixed(2))
      : monthlyPayment;

    balance = parseFloat((balance - installTotal).toFixed(2));

    schedule.push({
      installmentNo: i,
      dueDate,
      principal:     installPrincipal,
      interest:      interestPerInstalment,
      total:         installTotal,
      balance:       Math.max(balance, 0),
    });
  }

  return schedule;
}

// ─── 1. Get All Loans ─────────────────────────────────────────────────────────

/**
 * Returns paginated list of all loans.
 * @param {Object} options
 * @param {string} options.status  — "pending"|"active"|"closed"|"rejected"|"defaulted"|"all"
 * @param {number} options.page
 * @param {number} options.limit
 * @param {string} options.search  — member name or loan reference
 */
exports.getAllLoans = async ({ status, page, limit, search }) => {
  const offset = (page - 1) * limit;

  const loanWhere = {};
  if (status !== "all") loanWhere.status = status;
  if (search) loanWhere.reference = { [Op.like]: `%${search}%` };

  const memberWhere = {};
  if (search) {
    memberWhere[Op.or] = [
      { firstName: { [Op.like]: `%${search}%` } },
      { lastName:  { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await Loan.findAndCountAll({
    where:   loanWhere,
    include: [{
      model:      Member,
      attributes: ["id", "firstName", "lastName", "memberNumber", "phone"],
      where:      Object.keys(memberWhere).length ? memberWhere : undefined,
      required:   false,
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

// ─── 2. Get Loan By ID ────────────────────────────────────────────────────────

/**
 * Returns a single loan with member info, repayment summary,
 * and calculated terms.
 * @param {number|string} id
 */
exports.getLoanById = async (id) => {
  const loan = await Loan.findByPk(id, {
    include: [{
      model:      Member,
      attributes: ["id", "firstName", "lastName", "memberNumber", "phone", "email"],
    }],
  });

  if (!loan) return null;

  // Repayment summary
  const totalRepaid = await Repayment.sum("amount", { where: { loanId: id } }) || 0;
  const terms       = calcLoanTerms(loan.principal, loan.interestRate, loan.termMonths);

  return {
    ...loan.toJSON(),
    totalRepaid,
    balance:    parseFloat((terms.totalPayable - totalRepaid).toFixed(2)),
    terms,
  };
};

// ─── 3. Create Loan Application ───────────────────────────────────────────────

/**
 * Submits a new loan application with status "pending".
 * Validates member exists and has no other active loans (configurable).
 *
 * @param {Object} body
 * @param {number} body.memberId
 * @param {number} body.principal
 * @param {number} body.interestRate  — annual decimal e.g. 0.12
 * @param {number} body.termMonths
 * @param {string} body.loanType      — "personal" | "business" | "emergency"
 * @param {string} body.purpose
 */
exports.createLoan = async (body) => {
  const { memberId, principal, interestRate, termMonths, loanType, purpose } = body;

  // Confirm member exists
  const member = await Member.findByPk(memberId);
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  // Block if member already has an active loan (business rule — remove if not needed)
  const existingActive = await Loan.findOne({ where: { memberId, status: "active" } });
  if (existingActive) {
    throw Object.assign(
      new Error("Member already has an active loan. Please repay it before applying for a new one."),
      { status: 400 }
    );
  }

  const terms = calcLoanTerms(principal, interestRate, termMonths);

  const loan = await Loan.create({
    memberId,
    reference:      generateLoanReference(),
    principal:      parseFloat(principal),
    interestRate:   parseFloat(interestRate),
    termMonths:     parseInt(termMonths),
    monthlyPayment: terms.monthlyPayment,
    totalInterest:  terms.totalInterest,
    totalPayable:   terms.totalPayable,
    balance:        terms.totalPayable,
    loanType:       loanType || "personal",
    purpose:        purpose  || null,
    status:         "pending",
  });

  return { loan, terms };
};

// ─── 4. Update Loan ───────────────────────────────────────────────────────────

/**
 * Updates a loan still in "pending" status.
 * Recalculates terms if financial fields change.
 * @param {number|string} id
 * @param {Object} body
 */
exports.updateLoan = async (id, body) => {
  const loan = await Loan.findByPk(id);
  if (!loan) return null;

  if (loan.status !== "pending") {
    throw Object.assign(
      new Error("Only pending loans can be edited"),
      { status: 400 }
    );
  }

  const { principal, interestRate, termMonths, purpose } = body;

  if (principal    !== undefined) loan.principal    = parseFloat(principal);
  if (interestRate !== undefined) loan.interestRate = parseFloat(interestRate);
  if (termMonths   !== undefined) loan.termMonths   = parseInt(termMonths);
  if (purpose      !== undefined) loan.purpose      = purpose;

  // Recalculate terms
  const terms            = calcLoanTerms(loan.principal, loan.interestRate, loan.termMonths);
  loan.monthlyPayment    = terms.monthlyPayment;
  loan.totalInterest     = terms.totalInterest;
  loan.totalPayable      = terms.totalPayable;
  loan.balance           = terms.totalPayable;

  await loan.save();
  return { loan, terms };
};

// ─── 5. Cancel Loan ───────────────────────────────────────────────────────────

/**
 * Cancels a loan application — only when status is "pending".
 * @param {number|string} id
 */
exports.deleteLoan = async (id) => {
  const loan = await Loan.findByPk(id);
  if (!loan) throw Object.assign(new Error("Loan not found"), { status: 404 });

  if (loan.status !== "pending") {
    throw Object.assign(
      new Error("Only pending loan applications can be cancelled"),
      { status: 400 }
    );
  }

  loan.status = "cancelled";
  await loan.save();
  return loan;
};

// ─── 6. Approve Loan ──────────────────────────────────────────────────────────

/**
 * Approves a pending loan application.
 * @param {number|string} id
 * @param {Object} body — { notes? }
 */
exports.approveLoan = async (id, body) => {
  const loan = await Loan.findByPk(id);
  if (!loan) throw Object.assign(new Error("Loan not found"), { status: 404 });

  if (loan.status !== "pending") {
    throw Object.assign(
      new Error(`Cannot approve a loan with status "${loan.status}"`),
      { status: 400 }
    );
  }

  loan.status     = "approved";
  loan.approvedAt = new Date();
  loan.notes      = body.notes || null;
  await loan.save();

  return loan;
};

// ─── 7. Reject Loan ───────────────────────────────────────────────────────────

/**
 * Rejects a pending loan application.
 * @param {number|string} id
 * @param {Object} body — { reason }
 */
exports.rejectLoan = async (id, body) => {
  const loan = await Loan.findByPk(id);
  if (!loan) throw Object.assign(new Error("Loan not found"), { status: 404 });

  if (loan.status !== "pending") {
    throw Object.assign(
      new Error(`Cannot reject a loan with status "${loan.status}"`),
      { status: 400 }
    );
  }

  if (!body.reason) {
    throw Object.assign(new Error("A rejection reason is required"), { status: 400 });
  }

  loan.status         = "rejected";
  loan.rejectedAt     = new Date();
  loan.rejectionReason = body.reason;
  await loan.save();

  return loan;
};

// ─── 8. Disburse Loan ─────────────────────────────────────────────────────────

/**
 * Marks an approved loan as disbursed and sets the repayment start date.
 * Creates a Transaction record for the disbursement.
 * @param {number|string} id
 * @param {Object} body — { disbursedAt?, notes? }
 */
exports.disburseLoan = async (id, body) => {
  const loan = await Loan.findByPk(id);
  if (!loan) throw Object.assign(new Error("Loan not found"), { status: 404 });

  if (loan.status !== "approved") {
    throw Object.assign(
      new Error("Only approved loans can be disbursed"),
      { status: 400 }
    );
  }

  return sequelize.transaction(async (t) => {
    const disbursedAt = body.disbursedAt ? new Date(body.disbursedAt) : new Date();
    const dueDate     = new Date(disbursedAt);
    dueDate.setMonth(dueDate.getMonth() + loan.termMonths);

    loan.status       = "active";
    loan.disbursedAt  = disbursedAt;
    loan.dueDate      = dueDate;
    loan.notes        = body.notes || loan.notes;
    await loan.save({ transaction: t });

    // Record disbursement as a transaction
    await Transaction.create({
      memberId:    loan.memberId,
      loanId:      loan.id,
      type:        "loan_disbursement",
      amount:      loan.principal,
      reference:   loan.reference,
      description: `Loan disbursement — ${loan.reference}`,
    }, { transaction: t });

    return loan;
  });
};

// ─── 9. Record Repayment ──────────────────────────────────────────────────────

/**
 * Records a loan repayment and updates the outstanding balance atomically.
 * Automatically closes the loan if balance reaches zero.
 *
 * @param {number|string} id   — loan id
 * @param {Object} body
 * @param {number} body.amount
 * @param {string} body.paymentMethod
 * @param {string} body.reference
 * @param {string} body.notes
 */
exports.recordRepayment = async (id, body) => {
  const { amount, paymentMethod, reference, notes } = body;

  if (!amount || amount <= 0) {
    throw Object.assign(new Error("Repayment amount must be greater than zero"), { status: 400 });
  }

  return sequelize.transaction(async (t) => {
    const loan = await Loan.findByPk(id, {
      lock:        t.LOCK.UPDATE,
      transaction: t,
    });

    if (!loan) throw Object.assign(new Error("Loan not found"), { status: 404 });

    if (loan.status !== "active") {
      throw Object.assign(
        new Error("Repayments can only be made against active loans"),
        { status: 400 }
      );
    }

    if (parseFloat(amount) > parseFloat(loan.balance)) {
      throw Object.assign(
        new Error(`Amount exceeds outstanding balance. Balance: ${loan.balance}, Paid: ${amount}`),
        { status: 400 }
      );
    }

    loan.balance     = parseFloat((loan.balance - parseFloat(amount)).toFixed(2));
    loan.totalRepaid = parseFloat(((loan.totalRepaid || 0) + parseFloat(amount)).toFixed(2));

    // Auto-close if fully repaid
    if (loan.balance <= 0) {
      loan.balance   = 0;
      loan.status    = "closed";
      loan.closedAt  = new Date();
    }

    await loan.save({ transaction: t });

    const repayment = await Repayment.create({
      loanId:        loan.id,
      memberId:      loan.memberId,
      amount:        parseFloat(amount),
      balanceAfter:  loan.balance,
      paymentMethod: paymentMethod || "cash",
      reference:     reference || null,
      description:   notes || "Loan repayment",
    }, { transaction: t });

    // Mirror as a Transaction record
    await Transaction.create({
      memberId:    loan.memberId,
      loanId:      loan.id,
      type:        "loan_repayment",
      amount:      parseFloat(amount),
      reference:   reference || repayment.id.toString(),
      description: notes || `Repayment for ${loan.reference}`,
    }, { transaction: t });

    return {
      repayment,
      newBalance:  loan.balance,
      loanStatus:  loan.status,
      fullRepaid:  loan.status === "closed",
    };
  });
};

// ─── 10. Get Repayments ───────────────────────────────────────────────────────

/**
 * Returns paginated repayment history for a loan.
 * @param {number|string} id
 * @param {Object} options — { page, limit }
 */
exports.getRepayments = async (id, { page, limit }) => {
  const offset = (page - 1) * limit;

  const { count, rows } = await Repayment.findAndCountAll({
    where:  { loanId: id },
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

// ─── 11. Get Repayment Schedule ───────────────────────────────────────────────

/**
 * Returns the full amortised repayment schedule for a loan.
 * Marks each instalment as "paid", "due", or "upcoming".
 * @param {number|string} id
 */
exports.getRepaymentSchedule = async (id) => {
  const loan = await Loan.findByPk(id);
  if (!loan) throw Object.assign(new Error("Loan not found"), { status: 404 });

  const startDate = loan.disbursedAt || loan.createdAt;
  const schedule  = buildSchedule(loan.principal, loan.interestRate, loan.termMonths, startDate);
  const now       = new Date();

  // Fetch actual repayments to mark paid instalments
  const repayments  = await Repayment.findAll({ where: { loanId: id }, order: [["createdAt", "ASC"]] });
  let   totalPaid   = repayments.reduce((s, r) => s + parseFloat(r.amount), 0);

  const annotated = schedule.map((inst) => {
    let statusLabel = "upcoming";
    if (totalPaid >= inst.total) {
      statusLabel = "paid";
      totalPaid  -= inst.total;
    } else if (inst.dueDate < now) {
      statusLabel = "overdue";
    } else {
      statusLabel = "due";
    }
    return { ...inst, status: statusLabel };
  });

  return {
    loan:     { id: loan.id, reference: loan.reference, principal: loan.principal },
    schedule: annotated,
  };
};

// ─── 12. Get Loan Statement ───────────────────────────────────────────────────

/**
 * Returns a loan statement for a date range.
 * @param {number|string} id
 * @param {Object} options — { from, to }
 */
exports.getLoanStatement = async (id, { from, to }) => {
  const loan = await Loan.findByPk(id, {
    include: [{
      model:      Member,
      attributes: ["id", "firstName", "lastName", "memberNumber", "phone", "email"],
    }],
  });

  if (!loan) throw Object.assign(new Error("Loan not found"), { status: 404 });

  const repayments = await Repayment.findAll({
    where: { loanId: id, ...buildDateFilter(from, to) },
    order: [["createdAt", "ASC"]],
  });

  const totalRepaid = repayments.reduce((s, r) => s + parseFloat(r.amount), 0);

  return {
    loan,
    period:       { from, to },
    totalRepaid,
    balance:      loan.balance,
    repayments,
  };
};

// ─── 13. Get Loans By Member ──────────────────────────────────────────────────

/**
 * Returns all loans for a specific member with totals.
 * @param {number|string} memberId
 */
exports.getLoansByMember = async (memberId) => {
  const member = await Member.findByPk(memberId, {
    attributes: ["id", "firstName", "lastName", "memberNumber"],
  });
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  const loans = await Loan.findAll({
    where: { memberId },
    order: [["createdAt", "DESC"]],
  });

  const totalBorrowed    = loans.reduce((s, l) => s + parseFloat(l.principal),   0);
  const totalOutstanding = loans
    .filter((l) => l.status === "active")
    .reduce((s, l) => s + parseFloat(l.balance), 0);

  return { member, loans, totalBorrowed, totalOutstanding };
};

// ─── 14. Get Overdue Loans ────────────────────────────────────────────────────

/**
 * Returns all active loans past their due date, paginated.
 * @param {Object} options — { page, limit }
 */
exports.getOverdueLoans = async ({ page, limit }) => {
  const offset = (page - 1) * limit;
  const now    = new Date();

  const { count, rows } = await Loan.findAndCountAll({
    where: {
      status:  "active",
      dueDate: { [Op.lt]: now },
    },
    include: [{
      model:      Member,
      attributes: ["id", "firstName", "lastName", "memberNumber", "phone"],
    }],
    order:  [["dueDate", "ASC"]],
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



