/**
 * api/models/Interest.js
 * Sequelize model for interest records.
 */

const { DataTypes } = require("sequelize");
const sequelize     = require("../config/db");
const {
  ALL_INTEREST_TYPES,
  INTEREST_SOURCES,
} = require("../config/constants");

const Interest = sequelize.define("Interest", {
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
    comment:    "Set when interest is earned on a saving account",
  },
  loanId: {
    type:       DataTypes.INTEGER.UNSIGNED,
    allowNull:  true,
    references: { model: "loans", key: "id" },
    onDelete:   "SET NULL",
    onUpdate:   "CASCADE",
    comment:    "Set when interest is charged on a loan",
  },
  type: {
    type:      DataTypes.ENUM(...ALL_INTEREST_TYPES),
    allowNull: false,
    comment:   "earned=savings interest | charged=loan interest | paid=disbursed to member",
  },
  amount: {
    type:      DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate:  { min: 0 },
  },
  period: {
    type:      DataTypes.STRING(7),
    allowNull: false,
    comment:   "Calculation period e.g. 2026-05",
  },
  source: {
    type:         DataTypes.ENUM(...Object.values(INTEREST_SOURCES)),
    allowNull:    false,
    defaultValue: "system",
  },
  paidOut: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: false,
    comment:      "True after interest has been credited to member's saving account",
  },
  paidOutAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
  notes: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName:  "interest",
  timestamps: true,
  indexes: [
    { fields: ["memberId"] },
    { fields: ["savingId"] },
    { fields: ["loanId"]   },
    { fields: ["type"]     },
    { fields: ["period"]   },
    { fields: ["paidOut"]  },
  ],
});

// ─── Associations ─────────────────────────────────────────────────────────────
Interest.associate = (models) => {
  Interest.belongsTo(models.Member, { foreignKey: "memberId", as: "member" });
  Interest.belongsTo(models.Saving, { foreignKey: "savingId", as: "saving" });
  Interest.belongsTo(models.Loan,   { foreignKey: "loanId",   as: "loan"   });
};

module.exports = Interest;


