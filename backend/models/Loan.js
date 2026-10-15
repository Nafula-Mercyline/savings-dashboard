/**
 * api/models/Loan.js
 * Sequelize model for loans.
 */

const { DataTypes } = require("sequelize");
const sequelize     = require("../config/db");
const { ALL_LOAN_TYPES, ALL_LOAN_STATUSES } = require("../config/constants");

const Loan = sequelize.define("Loan", {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  memberId: {
    type:       DataTypes.INTEGER.UNSIGNED,
    allowNull:  false,
    references: { model: "members", key: "id" },
    onDelete:   "RESTRICT",
    onUpdate:   "CASCADE",
  },
  reference: {
    type:      DataTypes.STRING(25),
    allowNull: false,
    unique:    true,
    comment:   "Auto-generated e.g. LN-2026-91047",
  },
  loanType: {
    type:         DataTypes.ENUM(...ALL_LOAN_TYPES),
    allowNull:    false,
    defaultValue: "personal",
  },
  principal: {
    type:      DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate:  { min: 0 },
    comment:   "Original loan amount",
  },
  interestRate: {
    type:      DataTypes.DECIMAL(5, 4),
    allowNull: false,
    comment:   "Annual rate as decimal e.g. 0.12 = 12%",
    validate:  { min: 0, max: 1 },
  },
  termMonths: {
    type:      DataTypes.TINYINT.UNSIGNED,
    allowNull: false,
    comment:   "Repayment term in months",
    validate:  { min: 1, max: 60 },
  },
  monthlyPayment: {
    type:      DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment:   "Fixed monthly instalment amount",
  },
  totalInterest: {
    type:      DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  totalPayable: {
    type:      DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment:   "principal + totalInterest",
  },
  balance: {
    type:      DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment:   "Outstanding balance remaining",
    validate:  { min: 0 },
  },
  totalRepaid: {
    type:         DataTypes.DECIMAL(15, 2),
    allowNull:    false,
    defaultValue: 0.00,
  },
  purpose: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type:         DataTypes.ENUM(...ALL_LOAN_STATUSES),
    allowNull:    false,
    defaultValue: "pending",
  },
  approvedAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
  disbursedAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
  dueDate: {
    type:      DataTypes.DATEONLY,
    allowNull: true,
    comment:   "Final repayment due date",
  },
  closedAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
  rejectedAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
  rejectionReason: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
  notes: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName:  "loans",
  timestamps: true,
  indexes: [
    { fields: ["memberId"] },
    { fields: ["reference"] },
    { fields: ["status"] },
    { fields: ["dueDate"] },
  ],
});

// ─── Associations ─────────────────────────────────────────────────────────────
Loan.associate = (models) => {
  Loan.belongsTo(models.Member,        { foreignKey: "memberId", as: "member"      });
  Loan.hasMany(  models.LoanRepayment, { foreignKey: "loanId",   as: "repayments"  });
  Loan.hasMany(  models.Transaction,   { foreignKey: "loanId",   as: "transactions"});
  Loan.hasMany(  models.Interest,      { foreignKey: "loanId",   as: "interests"   });
};

module.exports = Loan;


