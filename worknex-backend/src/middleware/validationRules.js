const { body } = require('express-validator');

const strongPassword = (field) => body(field).isStrongPassword({
  minLength: 12,
  minLowercase: 1,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1,
}).withMessage('Password must be at least 12 characters and include upper, lower, number, and symbol');

const oneTimePassword = (field = 'token') => body(field)
  .isString()
  .trim()
  .matches(/^\d{6}$/)
  .withMessage('A valid 6-digit authentication code is required');

module.exports = { strongPassword, oneTimePassword };
