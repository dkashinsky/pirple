/*
 * User Model
 *
 */

// Dependencies
const { regex } = require('../helpers/validation');

// Validation
const phoneValidator = regex(/^\d{10}$/);

// Export model
module.exports = {
    phoneValidator
};