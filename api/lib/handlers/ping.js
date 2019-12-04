/*
 * Simple ping API service
 *
 */

 // Container for ping api handlers
 const handlers = {};

 // ping api handler
handlers.ping = function(request, callback){
    // return OK status code for any request to indicate that service is alive
    callback(200);
};

 // export handlers
 module.exports = handlers;