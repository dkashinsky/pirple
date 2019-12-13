/*
 * Checks API handler
 *
 */

// Dependencies
const { parseSafe } = require('../helpers/json');
const { Validator, from, minLength, between, notEmptyArray } = require('../helpers/validation');
const { apiError, getToken } = require('../helpers/api');
const { generateTokenId } = require('../models/token');
const fileStorage = require('../file-storage');
const config = require('../config');

// Handler container
const handlers = {};

// Checks API entry
handlers.checks = function (request, callback) {
    const acceptedRequestMethods = ['get', 'post', 'put', 'delete'];
    if (acceptedRequestMethods.indexOf(request.method) != -1) {
        handlers._checks[request.method](request, callback);
    }
    else {
        callback(405);
    }
};

// Container for all the checks methods
handlers._checks = {};

// Checks - post
// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
handlers._checks.post = function (request, callback) {
    parseSafe(request.payload, (err, data) => {
        if (!err) {
            const validator = new Validator({
                protocol: [from(['http', 'https'])],
                url: [minLength(4)],
                method: [from(['get', 'post', 'put', 'delete'])],
                successCodes: [notEmptyArray('number')],
                timeoutSeconds: [between([1, 5], true)]
            });

            // validate provided request data to conform the schema
            const validationResult = validator.validate(data);
            if (validationResult.isValid()) {
                // Get the token from the headers via helper
                const token = getToken(request);
                // lookup the token
                fileStorage.read('tokens', token, (err, tokenData) => {
                    if (!err && tokenData) {
                        // lookup the user
                        const userPhone = tokenData.phone;
                        fileStorage.read('users', userPhone, (err, userData) => {
                            if (!err && userData) {
                                const userChecks = userData.checks || [];
                                // verify that the user has less than the number of max-checks-per-user
                                if (userChecks.length < config.maxChecksPerUser) {
                                    const checkId = generateTokenId();
                                    const checkData = validationResult.getData();
                                    const check = {
                                        id: checkId,
                                        userPhone,
                                        protocol: checkData.protocol,
                                        url: checkData.url,
                                        method: checkData.method,
                                        successCodes: checkData.successCodes,
                                        timeoutSeconds: checkData.timeoutSeconds
                                    };
                                    fileStorage.create('checks', checkId, check, (err) => {
                                        if (!err) {
                                            userData.checks = userChecks;
                                            userData.checks.push(checkId);

                                            //update user data
                                            fileStorage.update('users', userPhone, userData, (err) => {
                                                if (!err) {
                                                    callback(200, check);
                                                } else {
                                                    callback(500, apiError('Could not update the user with the new check'))
                                                }
                                            });
                                        } else {
                                            callback(500, apiError('Could not create the new check object'))
                                        }
                                    });
                                } else {
                                    callback(400, apiError(`The user already has the maximum number of checks (${config.maxChecksPerUser})`))
                                }
                            } else {
                                callback(403, apiError('Unauthenticated request'));
                            }
                        });
                    } else {
                        callback(403, apiError('Unauthenticated request'));
                    }
                });
            }
            else {
                callback(400, apiError('Missing or invalid required fields'));
            }
        }
        else {
            callback(422, apiError('Unable to process entity'));
        }
    });
};

// Export module
module.exports = handlers;