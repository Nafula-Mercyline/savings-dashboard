/**
 * api/models/RolePermission.js
 *
 * Junction table linking Roles to Permissions (many-to-many).
 *
 * One row = one role has one permission.
 * e.g.  { roleId: 2 (treasurer), permissionId: 14 (loans:approve) }
 *
 * Also holds the default permission matrix used to seed the
 * role_permissions table on first startup.
 */

const { DataTypes } = require("sequelize");
const sequelize     = require("../config/db");

const RolePermission = sequelize.define("RolePermission", {

  roleId: {
    type:       DataTypes.INTEGER.UNSIGNED,
    allowNull:  false,
    primaryKey: true,
    references: { model: "roles", key: "id" },
    onDelete:   "CASCADE",
    onUpdate:   "CASCADE",
  },

  permissionId: {
    type:       DataTypes.INTEGER.UNSIGNED,
    allowNull:  false,
    primaryKey: true,
    references: { model: "permissions", key: "id" },
    onDelete:   "CASCADE",
    onUpdate:   "CASCADE",
  },

}, {
  tableName:  "role_permissions",
  timestamps: false,
  indexes: [
    { fields: ["roleId"]       },
    { fields: ["permissionId"] },
  ],
});

// ─── Associations ─────────────────────────────────────────────────────────────
RolePermission.associate = (models) => {
  RolePermission.belongsTo(models.Role,       { foreignKey: "roleId",       as: "role"       });
  RolePermission.belongsTo(models.Permission, { foreignKey: "permissionId", as: "permission" });
};

// ─── Default Role → Permission Matrix ────────────────────────────────────────
/**
 * Defines which permissions each role gets by default.
 * Used by the seeder to populate role_permissions on first startup.
 *
 * Format: { roleName: [permissionName, ...] }
 */
RolePermission.DEFAULT_MATRIX = {

  // ── Admin — full access to everything ─────────────────────────────────────
  admin: [
    "members:create",      "members:read",        "members:update",
    "members:delete",      "members:activate",    "members:deactivate",
    "savings:create",      "savings:read",        "savings:update",
    "savings:delete",      "savings:deposit",     "savings:withdraw",
    "loans:create",        "loans:read",          "loans:update",
    "loans:approve",       "loans:reject",        "loans:disburse",
    "loans:repay",         "loans:delete",
    "interest:read",       "interest:calculate",  "interest:payout",
    "interest:create",     "interest:delete",
    "transactions:read",   "transactions:create", "transactions:reverse",
    "transactions:export",
    "reports:view",        "reports:export",      "reports:schedule",
    "settings:manage",
    "users:create",        "users:read",          "users:update",
    "users:deactivate",    "users:assign",
    "roles:read",          "roles:manage",
    "audit_logs:read",     "audit_logs:export",
    "notifications:read",  "notifications:manage",
  ],

  // ── Treasurer — financial operations, no member management ────────────────
  treasurer: [
    "members:read",
    "savings:create",      "savings:read",        "savings:update",
    "savings:deposit",     "savings:withdraw",
    "loans:create",        "loans:read",
    "loans:disburse",      "loans:repay",
    "interest:read",       "interest:calculate",  "interest:payout",
    "transactions:read",   "transactions:export",
    "reports:view",        "reports:export",
    "audit_logs:read",
    "notifications:read",
  ],

  // ── Secretary — member management, read-only financials ───────────────────
  secretary: [
    "members:create",      "members:read",        "members:update",
    "members:activate",    "members:deactivate",
    "savings:read",
    "loans:create",        "loans:read",
    "transactions:read",
    "reports:view",
    "notifications:read",
  ],

  // ── Member — own data only ─────────────────────────────────────────────────
  member: [
    "members:read",
    "savings:read",
    "loans:read",
    "transactions:read",
    "notifications:read",
  ],

};

// ─── Seeder ───────────────────────────────────────────────────────────────────
/**
 * Seeds the role_permissions table using DEFAULT_MATRIX.
 * Requires Role and Permission tables to already be populated.
 * Safe to run multiple times — skips existing rows.
 *
 * Usage in server.js:
 *   const RolePermission = require("./models/RolePermission");
 *   await RolePermission.seed();
 */
RolePermission.seed = async function () {
  const Role       = require("./Role");
  const Permission = require("./Permission");

  let created = 0;
  let skipped = 0;

  for (const [roleName, permNames] of Object.entries(RolePermission.DEFAULT_MATRIX)) {

    // Find the role row
    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      console.warn(`⚠️  Role "${roleName}" not found — skipping its permissions`);
      continue;
    }

    for (const permName of permNames) {

      // Find the permission row
      const perm = await Permission.findOne({ where: { name: permName } });
      if (!perm) {
        console.warn(`⚠️  Permission "${permName}" not found — skipping`);
        skipped++;
        continue;
      }

      // Insert if not already present
      const [, wasCreated] = await RolePermission.findOrCreate({
        where:    { roleId: role.id, permissionId: perm.id },
        defaults: { roleId: role.id, permissionId: perm.id },
      });

      if (wasCreated) created++;
      else            skipped++;
    }
  }

  console.log(`✅ RolePermissions seeded (${created} new, ${skipped} existing/skipped)`);
};

// ─── Helper: check if a role has a permission ────────────────────────────────
/**
 * Checks whether a given role has a specific permission.
 *
 * @param {number} roleId
 * @param {string} permissionName — e.g. "loans:approve"
 * @returns {Promise<boolean>}
 */
RolePermission.roleHasPermission = async function (roleId, permissionName) {
  const Permission = require("./Permission");

  const perm = await Permission.findOne({ where: { name: permissionName } });
  if (!perm) return false;

  const row = await RolePermission.findOne({
    where: { roleId, permissionId: perm.id },
  });

  return !!row;
};

/**
 * Returns all permission names for a given role.
 *
 * @param {number} roleId
 * @returns {Promise<string[]>}
 */
RolePermission.getPermissionsForRole = async function (roleId) {
  const Permission = require("./Permission");

  const rows = await RolePermission.findAll({
    where:   { roleId },
    include: [{ model: Permission, as: "permission", attributes: ["name"] }],
  });

  return rows.map((r) => r.permission.name);
};

module.exports = RolePermission;
