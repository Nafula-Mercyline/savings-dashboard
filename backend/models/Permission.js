/**
 * api/models/Permission.js
 *
 * Sequelize model for granular permissions.
 * Each permission represents a single action on a resource.
 *
 * Naming convention:  resource:action
 * Examples:
 *   savings:create    — open a new saving account
 *   loans:approve     — approve a loan application
 *   reports:export    — download a report
 *   settings:manage   — change system settings
 */

const { DataTypes } = require("sequelize");
const sequelize     = require("../config/db");

// ─── Supported resources ──────────────────────────────────────────────────────
const RESOURCES = [
  "members",
  "savings",
  "loans",
  "interest",
  "transactions",
  "reports",
  "settings",
  "users",
  "roles",
  "notifications",
  "audit_logs",
];

// ─── Supported actions ────────────────────────────────────────────────────────
const ACTIONS = [
  "create",
  "read",
  "update",
  "delete",
  "approve",
  "reject",
  "disburse",
  "deposit",
  "withdraw",
  "repay",
  "calculate",
  "payout",
  "export",
  "view",
  "schedule",
  "manage",
  "reverse",
  "activate",
  "deactivate",
  "assign",
];

const Permission = sequelize.define("Permission", {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },

  // Unique identifier e.g. "savings:deposit"
  name: {
    type:      DataTypes.STRING(100),
    allowNull: false,
    unique:    true,
    validate: {
      notEmpty: true,
      is: /^[a-z_]+:[a-z_]+$/i,
    },
    comment: "Format: resource:action e.g. loans:approve",
  },

  resource: {
    type:      DataTypes.ENUM(...RESOURCES),
    allowNull: false,
    comment:   "The module this permission controls",
  },

  action: {
    type:      DataTypes.ENUM(...ACTIONS),
    allowNull: false,
    comment:   "The operation being permitted",
  },

  displayName: {
    type:      DataTypes.STRING(120),
    allowNull: true,
    comment:   "Human-readable label e.g. Approve Loans",
  },

  description: {
    type:      DataTypes.TEXT,
    allowNull: true,
    comment:   "Detailed description shown in the settings UI",
  },

  // Some permissions are always granted or always denied regardless of role
  isDefault: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: false,
    comment:      "If true, granted to all authenticated users by default",
  },

}, {
  tableName:  "permissions",
  timestamps: true,
  indexes: [
    { unique: true, fields: ["name"]              },
    { unique: true, fields: ["resource", "action"] },
    { fields: ["resource"]                         },
    { fields: ["action"]                           },
  ],
});

// ─── Associations ─────────────────────────────────────────────────────────────
Permission.associate = (models) => {
  Permission.belongsToMany(models.Role, {
    through:    "role_permissions",
    foreignKey: "permissionId",
    otherKey:   "roleId",
    as:         "roles",
  });
};

// ─── Static: Default permissions seed data ────────────────────────────────────
/**
 * Returns the full list of default permissions to seed.
 * Each entry maps to one row in the permissions table.
 */
Permission.getDefaults = () => [
  // ── Members ────────────────────────────────────────────────────────────────
  { name: "members:create",     resource: "members",      action: "create",     displayName: "Register Member",          description: "Register a new SACCO member"                  },
  { name: "members:read",       resource: "members",      action: "read",       displayName: "View Members",             description: "View member profiles and records"             },
  { name: "members:update",     resource: "members",      action: "update",     displayName: "Edit Member",              description: "Update member personal details"               },
  { name: "members:delete",     resource: "members",      action: "delete",     displayName: "Delete Member",            description: "Soft-delete or deactivate a member"           },
  { name: "members:activate",   resource: "members",      action: "activate",   displayName: "Activate Member",          description: "Reactivate a deactivated member"              },
  { name: "members:deactivate", resource: "members",      action: "deactivate", displayName: "Deactivate Member",        description: "Deactivate an active member"                  },

  // ── Savings ────────────────────────────────────────────────────────────────
  { name: "savings:create",     resource: "savings",      action: "create",     displayName: "Open Saving Account",      description: "Open a new saving account for a member"       },
  { name: "savings:read",       resource: "savings",      action: "read",       displayName: "View Savings",             description: "View saving accounts and balances"            },
  { name: "savings:update",     resource: "savings",      action: "update",     displayName: "Edit Saving Account",      description: "Update saving account details"                },
  { name: "savings:delete",     resource: "savings",      action: "delete",     displayName: "Close Saving Account",     description: "Close a saving account"                       },
  { name: "savings:deposit",    resource: "savings",      action: "deposit",    displayName: "Record Deposit",           description: "Record a member deposit"                      },
  { name: "savings:withdraw",   resource: "savings",      action: "withdraw",   displayName: "Record Withdrawal",        description: "Record a member withdrawal"                   },

  // ── Loans ──────────────────────────────────────────────────────────────────
  { name: "loans:create",       resource: "loans",        action: "create",     displayName: "Apply for Loan",           description: "Submit a new loan application"                },
  { name: "loans:read",         resource: "loans",        action: "read",       displayName: "View Loans",               description: "View loan records and details"                },
  { name: "loans:update",       resource: "loans",        action: "update",     displayName: "Edit Loan",                description: "Edit a pending loan application"              },
  { name: "loans:approve",      resource: "loans",        action: "approve",    displayName: "Approve Loan",             description: "Approve a pending loan application"           },
  { name: "loans:reject",       resource: "loans",        action: "reject",     displayName: "Reject Loan",              description: "Reject a pending loan application"            },
  { name: "loans:disburse",     resource: "loans",        action: "disburse",   displayName: "Disburse Loan",            description: "Release approved loan funds"                  },
  { name: "loans:repay",        resource: "loans",        action: "repay",      displayName: "Record Repayment",         description: "Record a loan repayment"                      },
  { name: "loans:delete",       resource: "loans",        action: "delete",     displayName: "Cancel Loan",              description: "Cancel a pending loan application"            },

  // ── Interest ───────────────────────────────────────────────────────────────
  { name: "interest:read",      resource: "interest",     action: "read",       displayName: "View Interest",            description: "View interest records"                        },
  { name: "interest:calculate", resource: "interest",     action: "calculate",  displayName: "Calculate Interest",       description: "Run interest calculations for a period"       },
  { name: "interest:payout",    resource: "interest",     action: "payout",     displayName: "Process Interest Payout",  description: "Disburse earned interest to member accounts"  },
  { name: "interest:create",    resource: "interest",     action: "create",     displayName: "Manual Interest Entry",    description: "Manually create an interest adjustment"       },
  { name: "interest:delete",    resource: "interest",     action: "delete",     displayName: "Delete Interest Record",   description: "Delete an interest record (corrections only)" },

  // ── Transactions ───────────────────────────────────────────────────────────
  { name: "transactions:read",  resource: "transactions", action: "read",       displayName: "View Transactions",        description: "View all financial transactions"              },
  { name: "transactions:create",resource: "transactions", action: "create",     displayName: "Manual Transaction",       description: "Manually create a transaction"                },
  { name: "transactions:reverse",resource:"transactions", action: "reverse",    displayName: "Reverse Transaction",      description: "Reverse a completed transaction"              },
  { name: "transactions:export",resource: "transactions", action: "export",     displayName: "Export Transactions",      description: "Download transactions as CSV or Excel"        },

  // ── Reports ────────────────────────────────────────────────────────────────
  { name: "reports:view",       resource: "reports",      action: "view",       displayName: "View Reports",             description: "View all generated reports"                   },
  { name: "reports:export",     resource: "reports",      action: "export",     displayName: "Export Reports",           description: "Download reports as PDF, CSV, or Excel"       },
  { name: "reports:schedule",   resource: "reports",      action: "schedule",   displayName: "Schedule Reports",         description: "Create and manage scheduled auto-reports"     },

  // ── Settings ───────────────────────────────────────────────────────────────
  { name: "settings:manage",    resource: "settings",     action: "manage",     displayName: "Manage Settings",          description: "Change system-wide settings"                  },

  // ── Users ──────────────────────────────────────────────────────────────────
  { name: "users:create",       resource: "users",        action: "create",     displayName: "Create User",              description: "Create a new system user account"             },
  { name: "users:read",         resource: "users",        action: "read",       displayName: "View Users",               description: "View user accounts"                           },
  { name: "users:update",       resource: "users",        action: "update",     displayName: "Edit User",                description: "Update user account details"                  },
  { name: "users:deactivate",   resource: "users",        action: "deactivate", displayName: "Deactivate User",          description: "Disable a user account"                       },
  { name: "users:assign",       resource: "users",        action: "assign",     displayName: "Assign Role",              description: "Change a user's role"                         },

  // ── Roles ──────────────────────────────────────────────────────────────────
  { name: "roles:read",         resource: "roles",        action: "read",       displayName: "View Roles",               description: "View roles and their permissions"             },
  { name: "roles:manage",       resource: "roles",        action: "manage",     displayName: "Manage Roles",             description: "Create and edit custom roles"                 },

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  { name: "audit_logs:read",    resource: "audit_logs",   action: "read",       displayName: "View Audit Logs",          description: "View the system audit trail"                  },
  { name: "audit_logs:export",  resource: "audit_logs",   action: "export",     displayName: "Export Audit Logs",        description: "Download audit logs"                          },

  // ── Notifications ──────────────────────────────────────────────────────────
  { name: "notifications:read", resource: "notifications",action: "read",       displayName: "View Notifications",       description: "View own notifications"                       },
  { name: "notifications:manage",resource:"notifications",action: "manage",     displayName: "Manage Notifications",     description: "Manage all member notifications"              },
];

/**
 * Seeds all default permissions into the database.
 * Safe to run multiple times — uses findOrCreate.
 */
Permission.seed = async function () {
  const defaults = Permission.getDefaults();
  let created = 0;

  for (const perm of defaults) {
    const [, wasCreated] = await Permission.findOrCreate({
      where:    { name: perm.name },
      defaults: perm,
    });
    if (wasCreated) created++;
  }

  console.log(`✅ Permissions seeded (${created} new, ${defaults.length - created} existing)`);
};

module.exports = Permission;
module.exports.RESOURCES = RESOURCES;
module.exports.ACTIONS   = ACTIONS;


