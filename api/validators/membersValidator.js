/**
 * api/validators/membersValidator.js
 */
const Joi = require("joi");

const createMemberSchema = Joi.object({
  firstName:      Joi.string().max(80).required(),
  lastName:       Joi.string().max(80).required(),
  email:          Joi.string().email().required(),
  phone:          Joi.string().max(20).required(),
  nationalId:     Joi.string().max(30).allow("", null),
  dateOfBirth:    Joi.string().isoDate().allow("", null),
  gender:         Joi.string().valid("male","female","other").allow("", null),
  address:        Joi.string().max(500).allow("", null),
  nextOfKin:      Joi.string().max(150).allow("", null),
  nextOfKinPhone: Joi.string().max(20).allow("", null),
  occupation:     Joi.string().max(100).allow("", null),
  joinedAt:       Joi.string().isoDate().allow("", null),
});

const updateMemberSchema = Joi.object({
  firstName:      Joi.string().max(80),
  lastName:       Joi.string().max(80),
  email:          Joi.string().email(),
  phone:          Joi.string().max(20),
  address:        Joi.string().max(500).allow("", null),
  dateOfBirth:    Joi.string().isoDate().allow("", null),
  gender:         Joi.string().valid("male","female","other").allow("", null),
  nextOfKin:      Joi.string().max(150).allow("", null),
  nextOfKinPhone: Joi.string().max(20).allow("", null),
  occupation:     Joi.string().max(100).allow("", null),
});

module.exports = { createMemberSchema, updateMemberSchema };

