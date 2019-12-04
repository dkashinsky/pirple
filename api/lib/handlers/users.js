/*
 * Users API handler
 *
 */

 // Dependencies
 const { apiError } = require('../helpers/api');
 const { hash } = require('../helpers/hash');
 const { Validator, required, regex, bool  } = require('../helpers/validation');
 const fileStorage = require('../file-storage');

 // Container for api handlers
 const handlers = {};

 // users api handler
handlers.users = function(request, callback){
    const acceptedRequestMethods = ['get', 'post', 'put', 'delete'];
    if (acceptedRequestMethods.indexOf(request.method) != -1){
        handlers._users[request.method](request, callback);
    }
    else {
        callback(405);
    }
};

// user api methods container
handlers._users = {};

// Users - get
handlers._users.get = function(request, callback){
    const phone = typeof (request.query.phone) == 'string' && request.query.phone.trim().length == 11
};

// Users - post
// Required data: firstName, lastName, phone, password, tosAgreement
// Optional data: none
handlers._users.post = function(request, callback){
    const validator = new Validator({
        firstName: [required],
        lastName: [required],
        phone: [regex(/^\d{10}$/)],
        password: [required],
        tosAgreement: [bool(true)]
    });

    const validationResult = validator.validate(request.payload);
    console.log(validationResult);
    console.log(validationResult.getData());

    if (validationResult.isValid()){
        const user = validationResult.getData();
        fileStorage.read('users', user.phone, (err, data) => {
            //make sure that user does not already exist
            if (err){
                const hashedPassword = hash(user.password);
                if (hashedPassword){
                    const userData = {
                        firstName: user.firstName,
                        lastName: user.lastName,
                        phone: user.phone,
                        hashedPassword,
                        tosAgreement: true
                    };
                    fileStorage.create('users', user.phone, userData, (err) => {
                        if (!err){
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
};

// Users - put
handlers._users.put = function(request, callback){
    
};

// Users - delete
handlers._users.delete = function(request, callback){
    
};

 // export handlers
 module.exports = handlers;