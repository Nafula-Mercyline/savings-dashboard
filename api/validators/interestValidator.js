/**
 * api/validators/interestValidator.js
 */
const Joi = require("joi");

const createInterestSchema = Joi.object({
  memberId: Joi.number().integer().positive().required(),
  type:     Joi.string().valid("earned","charged","paid").required(),
  amount:   Joi.number().positive().required(),
  savingId: Joi.number().integer().positive().allow(null),
  loanId:   Joi.number().integer().positive().allow(null),
  notes:    Joi.string().max(500).allow("", null),
  period:   Joi.string().pattern(/^\d{4}-\d{2}$/).allow("", null),
});

const updateInterestSchema = Joi.object({
  amount: Joi.number().positive(),
  notes:  Joi.string().max(500).allow("", null),
});

const calculateSavingsSchema = Joi.object({
  period: Joi.string().valid("monthly","quarterly").default("monthly"),
  asAt:   Joi.string().isoDate().allow("", null),
  dryRun: Joi.boolean().default(false),
});

const calculateLoansSchema = Joi.object({
  period: Joi.string().valid("monthly","quarterly").default("monthly"),
  asAt:   Joi.string().isoDate().allow("", null),
  dryRun: Joi.boolean().default(false),
});

const payoutSchema = Joi.object({
  period:    Joi.string().pattern(/^\d{4}-\d{2}$/).allow("", null),
  memberIds: Joi.array().items(Joi.number().integer().positive()).allow(null),
});

module.exports = { createInterestSchema, updateInterestSchema, calculateSavingsSchema, calculateLoansSchema, payoutSchema };

