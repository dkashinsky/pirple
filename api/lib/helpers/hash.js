/*
 * Hash helper for password operations
 *
 */

// Dependencies
const crypto = require('crypto');
const config = require('../config');

// Helpers container
const helpers = {};

// Create a SHA256 hash
helpers.hash = function (str) {
    if (typeof (str) == 'string' && str.length > 0){
        const hmac = crypto.createHmac('sha256', config.hashingSecret);
        const hash = hmac.update(str).digest('hex');
        return hash;
    } 
    else {
        return false;
    }
};

// Export module
module.exports = helpers;