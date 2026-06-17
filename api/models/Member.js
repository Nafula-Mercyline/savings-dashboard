/**
 * api/models/Member.js
 * Sequelize model for SACCO members.
 */

const { DataTypes } = require("sequelize");
const sequelize     = require("../config/db");
const { ALL_MEMBER_STATUSES, ALL_GENDERS } = require("../config/constants");

const Member = sequelize.define("Member", {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  memberNumber: {
    type:      DataTypes.STRING(20),
    allowNull: false,
    unique:    true,
    comment:   "Auto-generated e.g. MBR-2026-00001",
  },
  firstName: {
    type:      DataTypes.STRING(80),
    allowNull: false,
  },
  lastName: {
    type:      DataTypes.STRING(80),
    allowNull: false,
  },
  email: {
    type:      DataTypes.STRING(150),
    allowNull: false,
    unique:    true,
    validate:  { isEmail: true },
  },
  phone: {
    type:      DataTypes.STRING(20),
    allowNull: false,
    unique:    true,
  },
  nationalId: {
    type:      DataTypes.STRING(30),
    allowNull: true,
    unique:    true,
  },
  dateOfBirth: {
    type:      DataTypes.DATEONLY,
    allowNull: true,
  },
  gender: {
    type:      DataTypes.ENUM(...ALL_GENDERS),
    allowNull: true,
  },
  address: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
  nextOfKin: {
    type:      DataTypes.STRING(150),
    allowNull: true,
  },
  nextOfKinPhone: {
    type:      DataTypes.STRING(20),
    allowNull: true,
  },
  occupation: {
    type:      DataTypes.STRING(100),
    allowNull: true,
  },
  avatarUrl: {
    type:      DataTypes.STRING(500),
    allowNull: true,
  },
  status: {
    type:         DataTypes.ENUM(...ALL_MEMBER_STATUSES),
    allowNull:    false,
    defaultValue: "active",
  },
  statusNote: {
    type:      DataTypes.TEXT,
    allowNull: true,
    comment:   "Reason for deactivation or activation note",
  },
  joinedAt: {
    type:         DataTypes.DATEONLY,
    allowNull:    false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName:  "members",
  timestamps: true,
  indexes: [
    { fields: ["memberNumber"] },
    { fields: ["email"] },
    { fields: ["phone"] },
    { fields: ["status"] },
  ],
});

// ─── Associations ─────────────────────────────────────────────────────────────
Member.associate = (models) => {
  Member.hasMany(models.Saving,      { foreignKey: "memberId", as: "savings"      });
  Member.hasMany(models.Loan,        { foreignKey: "memberId", as: "loans"        });
  Member.hasMany(models.Transaction, { foreignKey: "memberId", as: "transactions" });
  Member.hasMany(models.Interest,    { foreignKey: "memberId", as: "interests"    });
  Member.hasOne( models.User,        { foreignKey: "memberId", as: "user"         });
  Member.hasMany(models.Notification,{ foreignKey: "memberId", as: "notifications"});
};

// ─── Virtual ──────────────────────────────────────────────────────────────────
Member.prototype.fullName = function () {
  return `${this.firstName} ${this.lastName}`;
};

module.exports = Member;


