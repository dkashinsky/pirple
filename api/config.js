/*
* Environments configuration file
*
*/

//define environments container
const environments = {};

//dev environment configuration
environments.development = {
    'port': 3000,
    'configName': 'development'
}

//dev environment configuration
environments.production = {
    'port': 5000,
    'configName': 'production'
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