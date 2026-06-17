/**
 * a../models/User.js
 * Sequelize model for system users (login accounts).
 * Separate from Member — a member may or may not have a login account.
 */

const { DataTypes } = require("sequelize");
const sequelize     = require("../config/db");
const bcrypt        = require("bcryptjs");
const { ALL_ROLES } = require("../config/constants");

const User = sequelize.define("User", {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  memberId: {
    type:       DataTypes.INTEGER.UNSIGNED,
    allowNull:  true,
    unique:     true,
    references: { model: "members", key: "id" },
    onDelete:   "SET NULL",
    onUpdate:   "CASCADE",
    comment:    "Null for staff accounts not linked to a member",
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
    allowNull: true,
  },
  passwordHash: {
    type:      DataTypes.STRING(255),
    allowNull: false,
  },
  role: {
    type:         DataTypes.ENUM(...ALL_ROLES),
    allowNull:    false,
    defaultValue: "member",
  },
  avatarUrl: {
    type:      DataTypes.STRING(500),
    allowNull: true,
  },
  isActive: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: true,
  },
  // Password reset
  passwordResetToken: {
    type:      DataTypes.STRING(255),
    allowNull: true,
  },
  passwordResetExpires: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
  // Login tracking
  lastLoginAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
  lastLoginIp: {
    type:      DataTypes.STRING(45),
    allowNull: true,
  },
  loginAttempts: {
    type:         DataTypes.TINYINT.UNSIGNED,
    allowNull:    false,
    defaultValue: 0,
  },
  lockedUntil: {
    type:      DataTypes.DATE,
    allowNull: true,
    comment:   "Account locked until this time after too many failed attempts",
  },
  emailVerified: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: false,
  },
  emailVerifyToken: {
    type:      DataTypes.STRING(255),
    allowNull: true,
  },
}, {
  tableName:  "users",
  timestamps: true,
  indexes: [
    { fields: ["email"]    },
    { fields: ["memberId"] },
    { fields: ["role"]     },
    { fields: ["isActive"] },
  ],
});

// ─── Hooks ────────────────────────────────────────────────────────────────────

// Hash password before create or update
User.addHook("beforeSave", async (user) => {
  if (user.changed("passwordHash") && user.passwordHash && !user.passwordHash.startsWith("$2")) {
    const salt = await bcrypt.genSalt(12);
    user.passwordHash = await bcrypt.hash(user.passwordHash, salt);
  }
});

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Compares a plain-text password against the stored hash.
 * @param {string} plainPassword
 * @returns {Promise<boolean>}
 */
User.prototype.verifyPassword = async function (plainPassword) {
  return bcrypt.compare(plainPassword, this.passwordHash);
};

/**
 * Checks whether the account is currently locked.
 * @returns {boolean}
 */
User.prototype.isLocked = function () {
  return this.lockedUntil && new Date(this.lockedUntil) > new Date();
};

/**
 * Returns safe user data (no password hash).
 */
User.prototype.toSafeObject = function () {
  const { passwordHash, passwordResetToken, emailVerifyToken, ...safe } = this.toJSON();
  return safe;
};

// ─── Associations ─────────────────────────────────────────────────────────────
User.associate = (models) => {
  User.belongsTo(models.Member,   { foreignKey: "memberId", as: "member"    });
  User.hasMany(  models.AuditLog, { foreignKey: "userId",   as: "auditLogs" });
};

module.exports = User;


