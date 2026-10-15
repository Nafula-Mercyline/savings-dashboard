/**
 * api/models/ScheduledReport.js
 * Sequelize model for scheduled/auto-generated report configurations.
 */

const { DataTypes } = require("sequelize");
const sequelize     = require("../config/db");

const ScheduledReport = sequelize.define("ScheduledReport", {
  id: {
    type:          DataTypes.INTEGER.UNSIGNED,
    autoIncrement: true,
    primaryKey:    true,
  },
  reportType: {
    type:      DataTypes.ENUM(
      "financial","savings","loans","interest",
      "members","transactions","arrears","cashflow"
    ),
    allowNull: false,
  },
  frequency: {
    type:      DataTypes.ENUM("daily","weekly","monthly"),
    allowNull: false,
  },
  format: {
    type:         DataTypes.ENUM("pdf","csv","excel"),
    allowNull:    false,
    defaultValue: "pdf",
  },
  recipients: {
    type:      DataTypes.TEXT,
    allowNull: false,
    comment:   "JSON array of email addresses",
    get() {
      const value = this.getDataValue("recipients");
      try { return JSON.parse(value); } catch { return []; }
    },
    set(value) {
      this.setDataValue("recipients", JSON.stringify(value));
    },
  },
  dayOfMonth: {
    type:         DataTypes.TINYINT.UNSIGNED,
    allowNull:    false,
    defaultValue: 1,
    comment:      "Day of month to send (1-28)",
  },
  active: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: true,
  },
  lastRunAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
  nextRunAt: {
    type:      DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName:  "scheduled_reports",
  timestamps: true,
  indexes: [
    { fields: ["reportType"] },
    { fields: ["frequency"]  },
    { fields: ["active"]     },
  ],
});

// ─── Associations ─────────────────────────────────────────────────────────────
ScheduledReport.associate = (models) => {
  // No direct associations needed — standalone config table
};

module.exports = ScheduledReport;
