/**
 * api/middleware/validate.js
 *
 * Request Validation Middleware
 * Uses Joi schemas to validate req.body before it reaches the controller.
 * Returns a structured 422 error listing every field that failed.
 *
 * Usage in routes:
 *   const { createMemberSchema } = require("../validators/membersValidator");
 *   router.post("/", auth, roles(["admin"]), validate(createMemberSchema), controller.create);
 *
 * Requires:  npm install joi
 */

/**
 * validate(schema)
 * Returns an Express middleware that validates req.body against the given Joi schema.
 *
 * @param {import("joi").ObjectSchema} schema — a Joi schema object
 */
const validate = (schema) => {
    if (!schema || typeof schema.validate !== "function") {
      throw new Error("validate() requires a valid Joi schema.");
    }
  
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body, {
        abortEarly:   false,  // collect ALL errors, not just the first
        stripUnknown: true,   // remove fields not defined in the schema
        convert:      true,   // coerce types where safe (string "5" → number 5)
      });
  
      if (error) {
        // Map Joi ValidationError details to a clean array
        const errors = error.details.map((detail) => ({
          field:   detail.path.join("."),
          message: detail.message.replace(/['"]/g, ""),
        }));
  
        return res.status(422).json({
          success: false,
          message: "Validation failed. Please check the fields below.",
          errors,
        });
      }
  
      // Replace req.body with the sanitised & coerced value from Joi
      req.body = value;
      next();
    };
  };
  
  module.exports = validate;
  
  
  // ─── Common reusable Joi rules ─────────────────────────────────────────────────
  // Import these in your validator files to keep schemas DRY.
  
  const Joi = require("joi");
  
  /**
   * Positive monetary amount (max 2 decimal places, > 0).
   * Usage: amount: rules.money.required()
   */
  const money = Joi.number().positive().precision(2);
  
  /**
   * Uganda phone number — accepts 07xxxxxxxx, +256xxxxxxxx, 256xxxxxxxx
   */
  const ugandaPhone = Joi.string()
    .pattern(/^(\+?256|0)7[0-9]{8}$/)
    .messages({ "string.pattern.base": "Phone must be a valid Uganda number e.g. 0712345678" });
  
  /**
   * Email address.
   */
  const email = Joi.string().email().lowercase().trim();
  
  /**
   * Date string in YYYY-MM-DD format.
   */
  const dateString = Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .messages({ "string.pattern.base": "Date must be in YYYY-MM-DD format" });
  
  /**
   * Positive integer ID (for foreign keys like memberId, savingId, etc.)
   */
  const id = Joi.number().integer().positive();
  
  /**
   * Payment method enum.
   */
  const paymentMethod = Joi.string()
    .valid("cash", "mobile_money", "bank_transfer", "cheque")
    .default("cash");
  
  module.exports.rules = { money, ugandaPhone, email, dateString, id, paymentMethod };
  


