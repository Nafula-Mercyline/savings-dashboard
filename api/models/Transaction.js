/**
 * api/models/Transaction.js
 * Sequelize model for all financial transactions.
 */

const { DataTypes } = require("sequelize");
const sequelize     = require("../config/db");
const {
  ALL_TRANSACTION_TYPES,
  ALL_TRANSACTION_STATUSES,
  ALL_PAYMENT_METHODS,
  TRANSACTION_SOURCES,
} = require("../config/constants");

const Transaction = sequelize.define("Transaction", {
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
  savingId: {
    type:       DataTypes.INTEGER.UNSIGNED,
    allowNull:  true,
    references: { model: "savings", key: "id" },
    onDelete:   "SET NULL",
    onUpdate:   "CASCADE",
  },
  loanId: {
    type:       DataTypes.INTEGER.UNSIGNED,
    allowNull:  true,
    references: { model: "loans", key: "id" },
    onDelete:   "SET NULL",
    onUpdate:   "CASCADE",
  },
  type: {
    type:      DataTypes.ENUM(...ALL_TRANSACTION_TYPES),
    allowNull: false,
  },
  amount: {
    type:      DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate:  { min: 0.01 },
  },
  balanceAfter: {
    type:      DataTypes.DECIMAL(15, 2),
    allowNull: true,
    comment:   "Account balance immediately after this transaction",
  },
  paymentMethod: {
    type:         DataTypes.ENUM(...ALL_PAYMENT_METHODS),
    allowNull:    true,
    defaultValue: "cash",
  },
  reference: {
    type:      DataTypes.STRING(60),
    allowNull: true,
    comment:   "Auto-generated TXN reference or external ref",
  },
  description: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type:         DataTypes.ENUM(...ALL_TRANSACTION_STATUSES),
    allowNull:    false,
    defaultValue: "completed",
  },
  source: {
    type:         DataTypes.ENUM(...Object.values(TRANSACTION_SOURCES)),
    allowNull:    false,
    defaultValue: "system",
    comment:      "system = auto | manual = admin entry",
  },
  // Reversal fields
  reversalOf: {
    type:       DataTypes.INTEGER.UNSIGNED,
    allowNull:  true,
    references: { model: "transactions", key: "id" },
    onDelete:   "SET NULL",
    comment:    "ID of the original transaction this reversal compensates",
  },
  reversalReason: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
  reversedAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName:  "transactions",
  timestamps: true,
  indexes: [
    { fields: ["memberId"]  },
    { fields: ["savingId"]  },
    { fields: ["loanId"]    },
    { fields: ["type"]      },
    { fields: ["status"]    },
    { fields: ["reference"] },
    { fields: ["createdAt"] },
  ],
});

// ─── Associations ─────────────────────────────────────────────────────────────
Transaction.associate = (models) => {
  Transaction.belongsTo(models.Member, { foreignKey: "memberId", as: "member" });
  Transaction.belongsTo(models.Saving, { foreignKey: "savingId", as: "saving" });
  Transaction.belongsTo(models.Loan,   { foreignKey: "loanId",   as: "loan"   });
  Transaction.belongsTo(models.Transaction, {
    foreignKey: "reversalOf",
    as:         "originalTransaction",
  });
};

module.exports = Transaction;


