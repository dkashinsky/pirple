/*
* Main API handler
*
*/

//Dependencies
const url = require('url');
const { trimPath } = require('./helpers/url');
const healthCheckHandler = require('./handlers/ping');
const usersHandler = require('./handlers/users');
const tokensHandler = require('./handlers/tokens');
const checksHandler = require('./handlers/checks');


function apiHandler(req, res){
    //get requested url and parse query
    const requestedUrl = url.parse(req.url, true);
    const trimmedPath = trimPath(requestedUrl.pathname);

    let requestHandler = typeof (router[trimmedPath]) == "function"
        ? router[trimmedPath]
        : handler.notFound
        ;

    //get neccessary request data and normalize it
    const request = {
        method: req.method.toLowerCase(),
        path: trimmedPath,
        headers: req.headers,
        query: requestedUrl.query,
        payload: null
    };

    //switch request to flowing mode to read request data
    const body = [];
    req.on('data', (chunk) => body.push(chunk));

    //respond once request is read completely
    req.on('end', () => {

        //convert body to string
        request.payload = Buffer.concat(body).toString('utf-8');

        requestHandler(request, (statusCode, payload) => {
            res.writeHead(statusCode, {
                'Content-Type': 'application/json'
            });
            res.write(JSON.stringify(payload || {}));
            res.end();
        });
    });
}

//handler
const handler = {};

//default handler
handler.notFound = function(request, callback){
    callback(404);
};

//router
const router = {
    'ping': healthCheckHandler.ping,
    'users': usersHandler.users,
    'tokens': tokensHandler.tokens,
    'checks': checksHandler.checks
};

// Export module
module.exports = apiHandler;