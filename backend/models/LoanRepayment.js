/**
 * api/models/LoanRepayment.js
 * Sequelize model for loan repayment records.
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const { ALL_PAYMENT_METHODS } = require("../config/constants");

const LoanRepayment = sequelize.define("LoanRepayment", {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    loanId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "loans", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
    },
    memberId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "members", key: "id" },
        onDelete: "RESTRICT",
        onUpdate: "CASCADE",
        comment: "Denormalised for fast member-level queries",
    },
    amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 0.01 },
    },
    balanceAfter: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        comment: "Loan balance remaining after this repayment",
        validate: { min: 0 },
    },
    paymentMethod: {
        type: DataTypes.ENUM(...ALL_PAYMENT_METHODS),
        allowNull: false,
        defaultValue: "cash",
    },
    reference: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: "External payment reference or receipt number",
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: "Loan repayment",
    },
    installmentNumber: {
        type: DataTypes.SMALLINT.UNSIGNED,
        allowNull: true,
        comment: "Which instalment this payment corresponds to (1-based)",
    },
    isReversed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    reversedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    reversalReason: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: "loan_repayments",
    timestamps: true,
    indexes: [
        { fields: ["loanId"] },
        { fields: ["memberId"] },
        { fields: ["reference"] },
    ],
});

// ─── Associations ─────────────────────────────────────────────────────────────
LoanRepayment.associate = (models) => {
    LoanRepayment.belongsTo(models.Loan, { foreignKey: "loanId", as: "loan" });
    LoanRepayment.belongsTo(models.Member, { foreignKey: "memberId", as: "member" });
};

module.exports = LoanRepayment;


