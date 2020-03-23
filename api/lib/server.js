/*
* Primary file for the API
*
*/

//Dependencies
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const configuration = require('./config');
const apiHandler = require('./api');

//Instantiate and start the HTTP server
const httpServer = http.createServer(apiHandler);

//Instantiate and start the HTTPS server
const httpsServerOptions = {
    'key': fs.readFileSync(path.join(__dirname, '../https/key.pem')),
    'cert': fs.readFileSync(path.join(__dirname, '../https/cert.pem'))
};
const httpsServer = https.createServer(httpsServerOptions, apiHandler);

// Start script
function start(){
    // Start the HTTP server
    httpServer.listen(configuration.httpPort, notifyServerStarted(configuration.httpPort, configuration.configName));

    // Start the HTTPS server
    httpsServer.listen(configuration.httpsPort, notifyServerStarted(configuration.httpsPort, configuration.configName));
}

// server started callback
function notifyServerStarted(port, mode){
    return () => console.log(`Server started on port ${port} in ${mode} mode`);
}

// Export module
module.exports = {
    httpServer, 
    httpsServer,
    httpsServerOptions,
    start
};
