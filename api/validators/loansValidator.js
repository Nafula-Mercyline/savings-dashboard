/**
 * api/validators/loansValidator.js
 */
const Joi = require("joi");

const createLoanSchema = Joi.object({
  memberId:     Joi.number().integer().positive().required(),
  principal:    Joi.number().positive().required(),
  interestRate: Joi.number().min(0.05).max(0.36).required(),
  termMonths:   Joi.number().integer().min(1).max(60).required(),
  loanType:     Joi.string().valid("personal","business","emergency","education","mortgage").default("personal"),
  purpose:      Joi.string().max(500).allow("", null),
});

const updateLoanSchema = Joi.object({
  principal:    Joi.number().positive(),
  interestRate: Joi.number().min(0.05).max(0.36),
  termMonths:   Joi.number().integer().min(1).max(60),
  purpose:      Joi.string().max(500).allow("", null),
});

const repaymentSchema = Joi.object({
  amount:        Joi.number().positive().required(),
  paymentMethod: Joi.string().valid("cash","mobile_money","bank_transfer","cheque").default("cash"),
  reference:     Joi.string().max(100).allow("", null),
  notes:         Joi.string().max(500).allow("", null),
});

const approveSchema = Joi.object({
  notes: Joi.string().max(500).allow("", null),
});

const rejectSchema = Joi.object({
  reason: Joi.string().max(500).required(),
});

module.exports = { createLoanSchema, updateLoanSchema, repaymentSchema, approveSchema, rejectSchema };


