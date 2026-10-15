/**
 * api/models/AuditLog.js
 * Sequelize model for immutable audit trail records.
 * Every sensitive action (login, approval, deletion, setting change) is logged here.
 */

const { DataTypes } = require("sequelize");
const sequelize     = require("../config/db");

// ─── Auditable actions ────────────────────────────────────────────────────────
const AUDIT_ACTIONS = [
  // Auth
  "user.login",
  "user.logout",
  "user.login_failed",
  "user.locked",
  "user.password_reset",
  "user.password_changed",

  // Members
  "member.created",
  "member.updated",
  "member.activated",
  "member.deactivated",
  "member.deleted",

  // Savings
  "saving.created",
  "saving.deposit",
  "saving.withdrawal",
  "saving.closed",
  "saving.updated",

  // Loans
  "loan.applied",
  "loan.approved",
  "loan.rejected",
  "loan.disbursed",
  "loan.repayment",
  "loan.closed",
  "loan.defaulted",
  "loan.cancelled",

  // Interest
  "interest.calculated",
  "interest.payout",
  "interest.manual_entry",
  "interest.deleted",

  // Transactions
  "transaction.created",
  "transaction.reversed",

  // Reports
  "report.viewed",
  "report.exported",
  "report.scheduled",
  "report.schedule_deleted",

  // Settings
  "settings.updated",

  // Users
  "user.created",
  "user.updated",
  "user.role_changed",
  "user.deactivated",
];

const AuditLog = sequelize.define("AuditLog", {
  id: {
    type:          DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  userId: {
    type:       DataTypes.INTEGER.UNSIGNED,
    allowNull:  true,
    references: { model: "users", key: "id" },
    onDelete:   "SET NULL",
    onUpdate:   "CASCADE",
    comment:    "The user who performed the action (null for system actions)",
  },
  memberId: {
    type:       DataTypes.INTEGER.UNSIGNED,
    allowNull:  true,
    references: { model: "members", key: "id" },
    onDelete:   "SET NULL",
    onUpdate:   "CASCADE",
    comment:    "The member affected (if applicable)",
  },
  action: {
    type:      DataTypes.ENUM(...AUDIT_ACTIONS),
    allowNull: false,
    comment:   "The action that was performed",
  },
  // What was changed
  resourceType: {
    type:      DataTypes.STRING(50),
    allowNull: true,
    comment:   "e.g. Member, Loan, Saving, Transaction",
  },
  resourceId: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment:   "Primary key of the affected record",
  },
  // Change details
  before: {
    type:      DataTypes.JSON,
    allowNull: true,
    comment:   "State of the resource before the change",
  },
  after: {
    type:      DataTypes.JSON,
    allowNull: true,
    comment:   "State of the resource after the change",
  },
  changes: {
    type:      DataTypes.JSON,
    allowNull: true,
    comment:   "Flat list of changed fields with old/new values",
  },
  // Request context
  ipAddress: {
    type:      DataTypes.STRING(45),
    allowNull: true,
  },
  userAgent: {
    type:      DataTypes.STRING(500),
    allowNull: true,
  },
  // Human-readable summary for the audit log UI
  description: {
    type:      DataTypes.TEXT,
    allowNull: true,
    comment:   "Auto-generated plain-English description of the action",
  },
  // Outcome
  status: {
    type:         DataTypes.ENUM("success", "failure"),
    allowNull:    false,
    defaultValue: "success",
  },
  failureReason: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName:  "audit_logs",
  timestamps: true,
  updatedAt:  false,  // audit logs are immutable — no updatedAt
  indexes: [
    { fields: ["userId"]       },
    { fields: ["memberId"]     },
    { fields: ["action"]       },
    { fields: ["resourceType", "resourceId"] },
    { fields: ["createdAt"]    },
    { fields: ["status"]       },
  ],
});

// ─── Associations ─────────────────────────────────────────────────────────────
AuditLog.associate = (models) => {
  AuditLog.belongsTo(models.User,   { foreignKey: "userId",   as: "user"   });
  AuditLog.belongsTo(models.Member, { foreignKey: "memberId", as: "member" });
};

// ─── Static Helper ────────────────────────────────────────────────────────────

/**
 * Creates an audit log entry.
 * Usage:
 *   await AuditLog.log({
 *     userId:       req.user.id,
 *     action:       "loan.approved",
 *     resourceType: "Loan",
 *     resourceId:   loan.id,
 *     description:  `Loan ${loan.reference} approved by ${req.user.email}`,
 *     before:       { status: "pending" },
 *     after:        { status: "approved" },
 *     ipAddress:    req.ip,
 *     userAgent:    req.headers["user-agent"],
 *   });
 *
 * @param {Object} payload
 */
AuditLog.log = async function (payload) {
  try {
    return await AuditLog.create({
      userId:       payload.userId       || null,
      memberId:     payload.memberId     || null,
      action:       payload.action,
      resourceType: payload.resourceType || null,
      resourceId:   payload.resourceId   || null,
      before:       payload.before       || null,
      after:        payload.after        || null,
      changes:      payload.changes      || null,
      description:  payload.description  || null,
      ipAddress:    payload.ipAddress    || null,
      userAgent:    payload.userAgent
        ? String(payload.userAgent).substring(0, 500)
        : null,
      status:        payload.status        || "success",
      failureReason: payload.failureReason || null,
    });
  } catch (err) {
    // Audit logging must never break the main flow
    console.error("⚠️  AuditLog.log failed:", err.message);
  }
};

/**
 * Extracts changed fields between two plain objects.
 * Usage: AuditLog.diff(before, after) → { fieldName: { from, to } }
 *
 * @param {Object} before
 * @param {Object} after
 */
AuditLog.diff = function (before, after) {
  if (!before || !after) return null;
  const changes = {};
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const skip    = new Set(["createdAt", "updatedAt", "passwordHash"]);

  for (const key of allKeys) {
    if (skip.has(key)) continue;
    if (String(before[key]) !== String(after[key])) {
      changes[key] = { from: before[key], to: after[key] };
    }
  }
  return Object.keys(changes).length ? changes : null;
};

module.exports = AuditLog;
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;


