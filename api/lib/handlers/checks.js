/*
 * Checks API handler
 *
 */

// Dependencies
const { parseSafe } = require('../helpers/json');
const { Validator, optional, from, minLength, between, notEmptyArray } = require('../helpers/validation');
const { apiError, getToken } = require('../helpers/api');
const { generateTokenId, tokenValidator } = require('../models/token');
const { verifyToken } = require('../handlers/tokens');
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

// Checks - get
// Required data: id
// Optional data: none
handlers._checks.get = function (request, callback) {
    const validator = new Validator({
        id: [tokenValidator]
    });

    const validationResult = validator.validate(request.query);
    if (validationResult.isValid()) {
        const { id: checkId } = validationResult.getData();
        // lookup requested check
        fileStorage.read('checks', checkId, (err, checkData) => {
            if (!err && checkData) {
                const token = getToken(request);
                verifyToken(token, checkData.userPhone, (err) => {
                    if (!err) {
                        callback(200, checkData);
                    } else {
                        callback(403, apiError('Invalid or expired token'));
                    }
                });
            }
            else {
                callback(404, apiError('Check not found'));
            }
        });
    } else {
        callback(400, apiError('Missing or invalid check id'));
    }
};

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds
handlers._checks.put = function (request, callback) {
    parseSafe(request.payload, (err, data) => {
        if (!err) {
            const validator = new Validator({
                id: [tokenValidator],
                protocol: [optional, from(['http', 'https'])],
                url: [optional, minLength(4)],
                method: [optional, from(['get', 'post', 'put', 'delete'])],
                successCodes: [optional, notEmptyArray('number')],
                timeoutSeconds: [optional, between([1, 5], true)]
            });

            const validationResult = validator.validate(data);
            if (validationResult.isValid()) {
                const updateRequest = validationResult.getData([], false);
                const { id, protocol, url, method, successCodes, timeoutSeconds } = updateRequest;

                //Check whether request has fields to update
                if (protocol || url || method || successCodes || timeoutSeconds) {
                    // lookup the check
                    fileStorage.read('checks', id, (err, checkData) => {
                        if (!err && checkData) {
                            const token = getToken(request);
                            // check whether check belongs to the authenticated user
                            verifyToken(token, checkData.userPhone, (err) => {
                                if (!err) {
                                    const updatedCheck = { ...checkData, ...updateRequest };
                                    // Lookup the check data
                                    fileStorage.update('checks', id, updatedCheck, (err) => {
                                        if (!err) {
                                            callback(200);
                                        }
                                        else {
                                            callback(500, apiError('Could not update the check'));
                                        }
                                    });
                                }
                                else {
                                    callback(403);
                                }
                            });
                        }
                        else {
                            callback(404, apiError('Check to update is not found'));
                        }
                    });
                }
                else {
                    callback(400, apiError('Missing fields to update'))
                }
            }
            else {
                callback(400, apiError('Missing required fields'));
            }
        }
        else {
            callback(422, apiError('Unable to process entity'));
        }
    });
};

// Checks - delete
// Required data: id
// Optional data: none
handlers._checks.delete = function (request, callback) {
    const validator = new Validator({
        id: [tokenValidator]
    });

    const validationResult = validator.validate(request.query);
    if (validationResult.isValid()) {
        const { id: checkId } = validationResult.getData();
        // lookup requested check
        fileStorage.read('checks', checkId, (err, checkData) => {
            if (!err && checkData) {
                const token = getToken(request);
                verifyToken(token, checkData.userPhone, (err) => {
                    if (!err) {
                        fileStorage.delete('checks', checkId, (err) => {
                            if (!err) {
                                fileStorage.read('users', checkData.userPhone, (err, userData) => {
                                    if (!err && userData) {
                                        const userChecks = userData.checks || [];
                                        const checkPosition = userChecks.indexOf(checkId);

                                        if (checkPosition > -1) {
                                            userChecks.splice(checkPosition, 1);
                                            userData.checks = userChecks;

                                            // update users data
                                            fileStorage.update('users', checkData.userPhone, userData, (err) => {
                                                if (!err) {
                                                    callback(200);
                                                } else {
                                                    callback(500, apiError('Could not update the user'));
                                                }
                                            });
                                        } else {
                                            callback(500, apiError('Could not find the check on the user\'s object'));
                                        }
                                    } else {
                                        callback(500, apiError('Could not find the user who created the check'));
                                    }
                                });
                            } else {
                                callback(500, apiError('Could not delete the check data'));
                            }
                        });
                    } else {
                        callback(403, apiError('Invalid or expired token'));
                    }
                });
            }
            else {
                callback(404, apiError('Check not found'));
            }
        });
    } else {
        callback(400, apiError('Missing or invalid check id'));
    }
};

// Export module
module.exports = handlers;