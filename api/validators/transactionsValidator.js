/**
 * api/validators/transactionsValidator.js
 */
const Joi = require("joi");

const createTransactionSchema = Joi.object({
  memberId:      Joi.number().integer().positive().required(),
  type:          Joi.string().valid("deposit","withdrawal","adjustment").required(),
  amount:        Joi.number().positive().required(),
  savingId:      Joi.number().integer().positive().allow(null),
  loanId:        Joi.number().integer().positive().allow(null),
  paymentMethod: Joi.string().valid("cash","mobile_money","bank_transfer","cheque").default("cash"),
  reference:     Joi.string().max(100).allow("", null),
  description:   Joi.string().max(500).allow("", null),
});

module.exports = { createTransactionSchema };

