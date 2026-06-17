
/**
 * api/models/index.js
 * Central model registry — imports all models and wires associations.
 */

const sequelize = require("../config/db");

const Member = require("./Member");
const Saving = require("./Saving");
const Loan = require("./Loan");
const LoanRepayment = require("./LoanRepayment");
const Interest = require("./Interest");
const Transaction = require("./Transaction");
const User = require("./User");
const Role = require("./Role");
const Permission = require("./Permission");       // own file
const RolePermission = require("./RolePermission");  // own file
const Notification = require("./Notification");
const AuditLog = require("./AuditLog");
const ScheduledReport = require("./ScheduledReport");

const models = {
  Member,
  Saving,
  Loan,
  LoanRepayment,
  Interest,
  Transaction,
  User,
  Role,
  Permission,
  RolePermission,
  Notification,
  AuditLog,
  ScheduledReport,
};

// Wire all associations
Object.values(models).forEach((model) => {
  if (typeof model.associate === "function") {
    model.associate(models);
  }
});

module.exports = { sequelize, ...models };


