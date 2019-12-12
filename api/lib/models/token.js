/*
 * Token Model
 *
 */

// Dependencies
const { regex } = require('../helpers/validation');

// Configuration
const tokenLenght = 20;
const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';

// Validation
const tokenValidator = regex(new RegExp(`^[a-z\\d]{${tokenLenght}}$`));

// generate token id
function generateTokenId() {
    const alphaArray = Array.from(Array(tokenLenght)).map(getRandomAlpha);
    return alphaArray.join('');
}

function getRandomAlpha() {
    return alphabet.charAt(
        Math.floor(Math.random() * alphabet.length)
    );
}

// Export model
module.exports = {
    tokenValidator,
    generateTokenId
};