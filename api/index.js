/*
* Primary file for the API
*
*/

//Dependencies
const http = require('http');
const https = require('https');
const fs = require('fs');

const configuration = require('./config');
const echo = require('./handlers/echo');

//Instantiate and start the HTTP server
const httpServer = http.createServer(echo);
httpServer.listen(configuration.httpPort, () => {
    console.log(`Server started on port ${configuration.httpPort} in ${configuration.configName} mode`);
});

//Instantiate and start the HTTPS server
const httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};
const httpsServer = https.createServer(httpsServerOptions, echo);
httpsServer.listen(configuration.httpsPort, () => {
    console.log(`Server started on port ${configuration.httpsPort} in ${configuration.configName} mode`);
});
