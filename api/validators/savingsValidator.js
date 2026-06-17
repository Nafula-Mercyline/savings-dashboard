/**
 * api/validators/savingsValidator.js
 */
const Joi = require("joi");

const createSavingSchema = Joi.object({
  memberId:       Joi.number().integer().positive().required(),
  accountType:    Joi.string().valid("regular","fixed","junior","group").default("regular"),
  initialDeposit: Joi.number().min(0).default(0),
  interestRate:   Joi.number().min(0).max(1).default(0.08),
});

const updateSavingSchema = Joi.object({
  interestRate: Joi.number().min(0).max(1),
  accountType:  Joi.string().valid("regular","fixed","junior","group"),
  status:       Joi.string().valid("active","inactive","closed"),
});

const depositSchema = Joi.object({
  amount:        Joi.number().positive().required(),
  paymentMethod: Joi.string().valid("cash","mobile_money","bank_transfer","cheque").default("cash"),
  reference:     Joi.string().max(100).allow("", null),
  notes:         Joi.string().max(500).allow("", null),
});

const withdrawSchema = Joi.object({
  amount:        Joi.number().positive().required(),
  paymentMethod: Joi.string().valid("cash","mobile_money","bank_transfer","cheque").default("cash"),
  reference:     Joi.string().max(100).allow("", null),
  notes:         Joi.string().max(500).allow("", null),
});

module.exports = { createSavingSchema, updateSavingSchema, depositSchema, withdrawSchema };

