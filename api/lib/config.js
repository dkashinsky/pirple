/*
* Environments configuration file
*
*/

//define environments container
const environments = {};

//dev environment configuration
environments.development = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'configName': 'development',
    'hashingSecret': 'dev_hashing_secret',
    'maxChecksPerUser' : 5,
    'twilio': {
        'fromPhone': '+15005550006',
        'accountSid': 'ACb32d411ad7fe886aac54c665d25e5c5d',
        'authToken': '9455e3eb3109edc12e3d8c92768f7a67'
    }
}

//dev environment configuration
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'configName': 'production',
    'hashingSecret': 'prod_hashing_secret',
    'maxChecksPerUser' : 5,
    'twilio': {
        'fromPhone': '',
        'accountSid': '',
        'authToken': ''
    }
}

//get requested environment
const requestedEnvironment = typeof(process.env.NODE_ENV) == "string"
    ? process.env.NODE_ENV.toLowerCase()
    : ''
    ;

//check that requested environment is configured; otherwise default to dev;
const configToExport = typeof(environments[requestedEnvironment]) == "object"
    ? environments[requestedEnvironment]
    : environments.development;

module.exports = configToExport;