/**
 * a../models/Notification.js
 * Sequelize model for in-app and push notifications.
 */

const { DataTypes } = require("sequelize");
const sequelize     = require("../config/db");

// ─── Notification types ───────────────────────────────────────────────────────
const NOTIFICATION_TYPES = [
  "deposit",            // deposit received
  "withdrawal",         // withdrawal processed
  "loan_application",   // loan application received
  "loan_approved",      // loan approved
  "loan_rejected",      // loan rejected
  "loan_disbursed",     // loan funds released
  "loan_repayment",     // repayment recorded
  "loan_overdue",       // loan overdue reminder
  "interest_credit",    // interest credited to account
  "system",             // general system message
  "report",             // scheduled report delivered
  "account",            // account status change
];

const NOTIFICATION_CHANNELS = ["in_app", "email", "sms", "push"];

const Notification = sequelize.define("Notification", {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  memberId: {
    type:       DataTypes.INTEGER.UNSIGNED,
    allowNull:  false,
    references: { model: "members", key: "id" },
    onDelete:   "CASCADE",
    onUpdate:   "CASCADE",
  },
  type: {
    type:      DataTypes.ENUM(...NOTIFICATION_TYPES),
    allowNull: false,
  },
  title: {
    type:      DataTypes.STRING(150),
    allowNull: false,
  },
  message: {
    type:      DataTypes.TEXT,
    allowNull: false,
  },
  channel: {
    type:         DataTypes.ENUM(...NOTIFICATION_CHANNELS),
    allowNull:    false,
    defaultValue: "in_app",
  },
  isRead: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: false,
  },
  readAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
  // Link back to the resource that triggered this notification
  resourceType: {
    type:      DataTypes.STRING(50),
    allowNull: true,
    comment:   "e.g. loan, saving, transaction, interest",
  },
  resourceId: {
    type:      DataTypes.INTEGER.UNSIGNED,
    allowNull: true,
    comment:   "ID of the related resource",
  },
  // Extra structured data for the frontend (icon, color, action URL)
  metadata: {
    type:         DataTypes.JSON,
    allowNull:    true,
    comment:      "Arbitrary key-value pairs for UI rendering",
    defaultValue: {},
  },
  // Delivery status for email/SMS channels
  deliveryStatus: {
    type:         DataTypes.ENUM("pending", "sent", "failed", "skipped"),
    allowNull:    false,
    defaultValue: "pending",
  },
  deliveredAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
  failureReason: {
    type:      DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName:  "notifications",
  timestamps: true,
  indexes: [
    { fields: ["memberId"] },
    { fields: ["type"]     },
    { fields: ["isRead"]   },
    { fields: ["channel"]  },
    { fields: ["createdAt"]},
  ],
});

// ─── Associations ─────────────────────────────────────────────────────────────
Notification.associate = (models) => {
  Notification.belongsTo(models.Member, { foreignKey: "memberId", as: "member" });
};

// ─── Instance Methods ─────────────────────────────────────────────────────────

/**
 * Marks the notification as read and sets readAt timestamp.
 */
Notification.prototype.markRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
  return this;
};

// ─── Static Helpers ───────────────────────────────────────────────────────────

/**
 * Creates and saves a notification for a member.
 * Usage:
 *   await Notification.notify(memberId, {
 *     type:         "loan_approved",
 *     title:        "Loan Approved",
 *     message:      "Your loan LN-2026-00001 has been approved.",
 *     resourceType: "loan",
 *     resourceId:   loanId,
 *   });
 *
 * @param {number} memberId
 * @param {Object} payload — { type, title, message, channel?, resourceType?, resourceId?, metadata? }
 */
Notification.notify = async function (memberId, payload) {
  return Notification.create({
    memberId,
    type:         payload.type,
    title:        payload.title,
    message:      payload.message,
    channel:      payload.channel      || "in_app",
    resourceType: payload.resourceType || null,
    resourceId:   payload.resourceId   || null,
    metadata:     payload.metadata     || {},
    deliveryStatus: "sent",
    deliveredAt:  new Date(),
  });
};

/**
 * Marks all unread notifications for a member as read.
 * @param {number} memberId
 */
Notification.markAllRead = async function (memberId) {
  return Notification.update(
    { isRead: true, readAt: new Date() },
    { where: { memberId, isRead: false } }
  );
};

/**
 * Returns the count of unread notifications for a member.
 * @param {number} memberId
 */
Notification.unreadCount = async function (memberId) {
  return Notification.count({ where: { memberId, isRead: false } });
};

module.exports = Notification;


