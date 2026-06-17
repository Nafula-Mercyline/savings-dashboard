/**
 * api/validators/settingsValidator.js
 */
const Joi = require("joi");

const updateSettingsSchema = Joi.object({
  appName:            Joi.string().max(100).allow("", null),
  currency:           Joi.string().max(10).allow("", null),
  defaultSavingsRate: Joi.number().min(0).max(1).allow(null),
  defaultLoanRate:    Joi.number().min(0).max(1).allow(null),
  maxLoanAmount:      Joi.number().positive().allow(null),
  minLoanAmount:      Joi.number().positive().allow(null),
  maxLoanTermMonths:  Joi.number().integer().min(1).max(60).allow(null),
  smtpHost:           Joi.string().max(200).allow("", null),
  smtpPort:           Joi.number().integer().allow(null),
  smtpUser:           Joi.string().max(200).allow("", null),
  smtpPass:           Joi.string().max(200).allow("", null),
});

module.exports = { updateSettingsSchema };

