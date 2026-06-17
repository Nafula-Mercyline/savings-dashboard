/**
 * api/validators/reportsValidator.js
 */
const Joi = require("joi");

const scheduleReportSchema = Joi.object({
  reportType:  Joi.string().valid("financial","savings","loans","interest","members","transactions","arrears","cashflow").required(),
  frequency:   Joi.string().valid("daily","weekly","monthly").required(),
  format:      Joi.string().valid("pdf","csv","excel").default("pdf"),
  recipients:  Joi.array().items(Joi.string().email()).min(1).required(),
  dayOfMonth:  Joi.number().integer().min(1).max(28).default(1),
});

module.exports = { scheduleReportSchema };

