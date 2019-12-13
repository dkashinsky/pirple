/*
 * Users API handler
 *
 */

// Dependencies
const { apiError } = require('../helpers/api');
const { hash } = require('../helpers/hash');
const { parseSafe } = require('../helpers/json');
const { Validator, optional, required, bool, minLength } = require('../helpers/validation');
const { phoneValidator } = require('../models/user');
const { verifyToken } = require('./tokens');
const fileStorage = require('../file-storage');

// Container for api handlers
const handlers = {};

// users api handler
handlers.users = function (request, callback) {
    const acceptedRequestMethods = ['get', 'post', 'put', 'delete'];
    if (acceptedRequestMethods.indexOf(request.method) != -1) {
        handlers._users[request.method](request, callback);
    }
    else {
        callback(405);
    }
};

// user api methods container
handlers._users = {};

// Users - get
// Required data: phone
// Optional data: none
handlers._users.get = function (request, callback) {
    // Check that the phone number provided is valid
    const validator = new Validator({
        phone: [phoneValidator]
    });

    const validationResult = validator.validate(request.query);
    if (validationResult.isValid()) {
        const user = validationResult.getData();

        // only let authenticated users access their own object.
        verifyToken(request.headers.token, user.phone, (err) => {
            if (!err) {
                fileStorage.read('users', user.phone, (err, userData) => {
                    if (!err && userData) {
                        delete userData.hashedPassword;
                        callback(200, userData);
                    }
                    else {
                        callback(404);
                    }
                });
            }
            else {
                callback(403, apiError('Missing or invalid authentication token'));
            }
        });
    }
    else {
        callback(400, apiError('Missing required field'));
    }
};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function (request, callback) {
    parseSafe(request.payload, (err, data) => {
        if (!err) {
            const validator = new Validator({
                phone: [phoneValidator],
                firstName: [required],
                lastName: [required],
                password: [required],
                tosAgreement: [bool(true)]
            });

            const validationResult = validator.validate(data);
            if (validationResult.isValid()) {
                const user = validationResult.getData();
                fileStorage.read('users', user.phone, (err, data) => {
                    //make sure that user does not already exist
                    if (err) {
                        const hashedPassword = hash(user.password);
                        if (hashedPassword) {
                            const userData = {
                                firstName: user.firstName,
                                lastName: user.lastName,
                                phone: user.phone,
                                hashedPassword,
                                tosAgreement: true
                            };
                            fileStorage.create('users', user.phone, userData, (err) => {
                                if (!err) {
                                    callback(200);
                                }
                                else {
                                    callback(500, apiError('Could not create the new user'));
                                }
                            });
                        }
                        else {
                            callback(500, apiError('Could not hash the user\'s password'));
                        }
                    }
                    else {
                        callback(400, apiError('A user with that phone number already exists'));
                    }
                });
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

// Users - put
// Required data: phone
// Optional data: first name, last name, password (at least one must be specified)
handlers._users.put = function (request, callback) {
    // Check whether request body is malformed or not
    parseSafe(request.payload, (err, data) => {
        if (!err) {
            const validator = new Validator({
                phone: [phoneValidator],
                firstName: [optional, minLength(1)],
                lastName: [optional, minLength(1)],
                password: [optional, minLength(6)]
            });

            const validationResult = validator.validate(data);
            if (validationResult.isValid()) {
                const user = validationResult.getData([
                    { hashedPassword: (data) => hash(data.password), when: (data) => data.password },
                    { password: false }
                ], false);

                //Check whether request has fields to update
                if (user.firstName || user.lastName || user.hashedPassword) {

                    // only let the authenticated user update their own object
                    verifyToken(request.headers.token, user.phone, (err) => {
                        if (!err) {
                            // Lookup the user
                            fileStorage.read('users', user.phone, (err, userData) => {
                                //make sure that user does not already exist
                                if (!err && userData) {
                                    //override existing file data
                                    userData = { ...userData, ...user };
                                    fileStorage.update('users', user.phone, userData, (err) => {
                                        if (!err) {
                                            callback(200);
                                        }
                                        else {
                                            callback(500, apiError('Could not update the user'));
                                        }
                                    });
                                }
                                else {
                                    callback(400, apiError('The specified user does not exist'));
                                }
                            });
                        }
                        else {
                            callback(403, apiError('Missing or invalid authentication token'));
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

// Users - delete
// Required field: phone
handlers._users.delete = function (request, callback) {
    // check that the phone number is valid
    const validator = new Validator({
        phone: [phoneValidator]
    });

    const validationResult = validator.validate(request.query);
    if (validationResult.isValid()) {
        const user = validationResult.getData();

        // only let an authenticated user delete their object
        verifyToken(request.headers.token, user.phone, (err) => {
            if (!err) {
                fileStorage.read('users', user.phone, (err, userData) => {
                    if (!err && userData) {
                        fileStorage.delete('users', user.phone, (err) => {
                            if (!err) {
                                const userChecks = userData.checks || [];
                                const checksToDelete = userChecks.length;
                                if (checksToDelete > 0) {
                                    let checksDeleted = 0;
                                    let deletionErrors = false;

                                    userChecks.forEach(checkId => {
                                        fileStorage.delete('checks', checkId, (err) => {
                                            if (err) {
                                                deletionErrors = true;
                                            }
                                            checksDeleted++;
                                            if (checksDeleted == checksToDelete) {
                                                if (!deletionErrors) {
                                                    callback(200);
                                                } else {
                                                    callback(500, apiError('Errors encountered while attempting to delete all of the user\'s checks'));
                                                }
                                            }
                                        });
                                    });
                                } else {
                                    callback(200);
                                }
                            }
                            else {
                                callback(500, apiError('Could not delete the specified user'));
                            }
                        });
                    }
                    else {
                        callback(404, apiError('Could not find the specified user'));
                    }
                });
            }
            else {
                callback(403, apiError('Missing or invalid authentication token'));
            }
        });
    }
    else {
        callback(400, apiError('Missing required field'));
    }
};

// export handlers
module.exports = handlers;