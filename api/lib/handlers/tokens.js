/*
 * Tokens API handler
 *
 */

// Dependencies
const { apiError } = require('../helpers/api');
const { hash } = require('../helpers/hash');
const { parseSafe } = require('../helpers/json');
const { Validator, required, bool } = require('../helpers/validation');
const { phoneValidator } = require('../models/user');
const { tokenValidator, generateTokenId } = require('../models/token');
const fileStorage = require('../file-storage');

// Container for api handlers
const handlers = {};

// tokens api handler
handlers.tokens = function (request, callback) {
    const acceptedRequestMethods = ['get', 'post', 'put', 'delete'];
    if (acceptedRequestMethods.indexOf(request.method) != -1) {
        handlers._tokens[request.method](request, callback);
    }
    else {
        callback(405);
    }
};

// api methods container
handlers._tokens = {};


// Tokens - post
// Required data: phone, password
// Optional data: none
handlers._tokens.post = function (request, callback) {
    parseSafe(request.payload, (err, data) => {
        if (!err) {
            const validator = new Validator({
                phone: [phoneValidator],
                password: [required]
            });

            const validationResult = validator.validate(data);
            if (validationResult.isValid()) {
                const tokenRequest = validationResult.getData();
                fileStorage.read('users', tokenRequest.phone, (err, userData) => {
                    //make sure that user does not already exist
                    if (!err && userData) {
                        // hash password to compare to the password stored in the user data object
                        const hashedPassword = hash(tokenRequest.password);
                        if (hashedPassword === userData.hashedPassword) {
                            const token = {
                                id: generateTokenId(),
                                phone: tokenRequest.phone,
                                expires: Date.now() + 1000 * 60 * 60 // @TODO: get expiration from config file
                            };
                            fileStorage.create('tokens', token.id, token, (err) => {
                                if (!err) {
                                    callback(200, token);
                                }
                                else {
                                    callback(500, apiError('Could not create the new token'));
                                }
                            });
                        }
                        else {
                            callback(400, apiError('Wrong password'));
                        }
                    }
                    else {
                        callback(400, apiError('Could not find specified user'));
                    }
                });
            }
            else {
                callback(400, apiError('Missing required field(s)'));
            }
        }
        else {
            callback(422, apiError('Unable to process entity'));
        }
    });
};

// Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function (request, callback) {
    // Check that the phone number provided is valid
    const validator = new Validator({
        id: [tokenValidator]
    });

    const validationResult = validator.validate(request.query);
    if (validationResult.isValid()) {
        const tokenRequest = validationResult.getData();
        fileStorage.read('tokens', tokenRequest.id, (err, tokenData) => {
            if (!err && tokenData) {
                callback(200, tokenData);
            }
            else {
                callback(404, apiError('Token not found'));
            }
        });
    }
    else {
        callback(400, apiError('Missing or invalid token id'));
    }
};

// Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function (request, callback) {
    // Check whether request body is malformed or not
    parseSafe(request.payload, (err, data) => {
        if (!err) {
            const validator = new Validator({
                id: [tokenValidator],
                extend: [bool(true)]
            });

            const validationResult = validator.validate(data);
            if (validationResult.isValid()) {
                const extendRequest = validationResult.getData();
                fileStorage.read('tokens', extendRequest.id, (err, tokenData) => {
                    if (!err && tokenData) {
                        if (tokenData.expires > Date.now()) {
                            tokenData.expires = Date.now() + 1000 * 60 * 60;
                            fileStorage.update('tokens', tokenData.id, tokenData, (err) => {
                                if (!err) {
                                    callback(200);
                                }
                                else {
                                    callback(500, apiError('Could not update the specified token'));
                                }
                            });
                        }
                        else {
                            callback(404, apiError('Specified token has already expired'));
                        }
                    } else {
                        callback(404, apiError('Specified token does not exist'));
                    }
                });
            }
            else {
                callback(400, apiError('Missing or invalid required field(s)'));
            }
        }
        else {
            callback(422, apiError('Unable to process entity'));
        }
    });
};

// Tokens - delete
// Required fields: id
// Optional fields: none
handlers._tokens.delete = function (request, callback) {
    // check that the token id is valid
    const validator = new Validator({
        id: [tokenValidator]
    });

    const validationResult = validator.validate(request.query);
    if (validationResult.isValid()) {
        const deleteRequest = validationResult.getData();
        fileStorage.read('tokens', deleteRequest.id, (err, tokenData) => {
            if (!err && tokenData) {
                fileStorage.delete('tokens', deleteRequest.id, (err) => {
                    if (!err)
                        callback(200);
                    else
                        callback(500, apiError('Could not delete the specified token'));
                });
            }
            else {
                callback(404, apiError('Could not find the specified token'));
            }
        });
    }
    else {
        callback(400, apiError('Missing token id'));
    }
};

// verify if a given token id is currently valid for a given user
handlers.verifyToken = function (id, phone, callback) {
    //check if token exists
    fileStorage.read('tokens', id, (err, tokenData) => {
        if (!err && tokenData) {
            //check if token belongs to the user and has not expored
            const isValid = tokenData.phone === phone && tokenData.expires > Date.now();
            callback(!isValid);
        }
        else {
            callback(true);
        }
    });
};

// export handlers
module.exports = handlers;