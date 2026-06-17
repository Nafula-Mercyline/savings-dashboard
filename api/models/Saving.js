/**
 * api/models/Saving.js
 * Sequelize model for saving accounts.
 */

const { DataTypes } = require("sequelize");
const sequelize     = require("../config/db");
const { ALL_SAVING_TYPES, ALL_SAVING_STATUSES } = require("../config/constants");

const Saving = sequelize.define("Saving", {
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
  accountNumber: {
    type:      DataTypes.STRING(25),
    allowNull: false,
    unique:    true,
    comment:   "Auto-generated e.g. SAV-2026-48392",
  },
  accountType: {
    type:         DataTypes.ENUM(...ALL_SAVING_TYPES),
    allowNull:    false,
    defaultValue: "regular",
  },
  balance: {
    type:         DataTypes.DECIMAL(15, 2),
    allowNull:    false,
    defaultValue: 0.00,
    validate:     { min: 0 },
  },
  interestRate: {
    type:         DataTypes.DECIMAL(5, 4),
    allowNull:    false,
    defaultValue: 0.0800,
    comment:      "Annual rate as decimal e.g. 0.08 = 8%",
    validate:     { min: 0, max: 1 },
  },
  status: {
    type:         DataTypes.ENUM(...ALL_SAVING_STATUSES),
    allowNull:    false,
    defaultValue: "active",
  },
  closedAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName:  "savings",
  timestamps: true,
  indexes: [
    { fields: ["memberId"] },
    { fields: ["accountNumber"] },
    { fields: ["status"] },
  ],
});

// ─── Associations ─────────────────────────────────────────────────────────────
Saving.associate = (models) => {
  Saving.belongsTo(models.Member,      { foreignKey: "memberId",  as: "member"       });
  Saving.hasMany(  models.Transaction, { foreignKey: "savingId",  as: "transactions" });
  Saving.hasMany(  models.Interest,    { foreignKey: "savingId",  as: "interests"    });
};

// ─── Hooks ────────────────────────────────────────────────────────────────────
Saving.addHook("beforeSave", (saving) => {
  // Ensure balance never goes below 0
  if (parseFloat(saving.balance) < 0) saving.balance = 0;
});

module.exports = Saving;


