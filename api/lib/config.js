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
    'hashingSecret': 'dev_hashing_secret'
}

//dev environment configuration
environments.production = {
    'httpPort': 5000,
    'httpsPort': 5001,
    'configName': 'production',
    'hashingSecret': 'prod_hashing_secret'
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