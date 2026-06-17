/**
 * api/models/Role.js
 *
 * Sequelize model for system roles.
 * Permission and RolePermission live in their own files.
 *
 * Roles:
 *   admin      — full access
 *   treasurer  — financial operations
 *   secretary  — member management
 *   member     — own data only
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const { ALL_ROLES } = require("../config/constants");

const Role = sequelize.define("Role", {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.ENUM(...ALL_ROLES),
        allowNull: false,
        unique: true,
        comment: "admin | treasurer | secretary | member",
    },
    displayName: {
        type: DataTypes.STRING(80),
        allowNull: false,
        comment: "Human-readable label shown in the UI",
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    isSystem: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: "System roles cannot be deleted",
    },
}, {
    tableName: "roles",
    timestamps: true,
    indexes: [
        { unique: true, fields: ["name"] },
    ],
});

// Associations
Role.associate = (models) => {
    Role.belongsToMany(models.Permission, {
        through: models.RolePermission,
        foreignKey: "roleId",
        otherKey: "permissionId",
        as: "permissions",
    });
    Role.hasMany(models.RolePermission, {
        foreignKey: "roleId",
        as: "rolePermissions",
    });
};

// Default seed data
Role.getDefaults = () => [
    { name: "admin", displayName: "System Administrator", description: "Full access to all features", isSystem: true },
    { name: "treasurer", displayName: "Treasurer", description: "Manages savings, loans, interest calculations, and financial reports", isSystem: true },
    { name: "secretary", displayName: "Secretary", description: "Manages member records. Read-only access to financials", isSystem: true },
    { name: "member", displayName: "Member", description: "Can view their own savings, loans, and transactions", isSystem: true },
];

Role.seed = async function () {
    const defaults = Role.getDefaults();
    let created = 0;
    for (const roleData of defaults) {
        const [, wasCreated] = await Role.findOrCreate({ where: { name: roleData.name }, defaults: roleData });
        if (wasCreated) created++;
    }
    console.log(`✅ Roles seeded (${created} new, ${defaults.length - created} existing)`);
};

/**
 * Master seeder — roles → permissions → role_permissions in order.
 * Usage in server.js:  await Role.seedAll();
 */
Role.seedAll = async function () {
    const Permission = require("./Permission");
    const RolePermission = require("./RolePermission");
    await Role.seed();
    await Permission.seed();
    await RolePermission.seed();
    console.log("✅ Full role/permission seed complete");
};

module.exports = Role;


