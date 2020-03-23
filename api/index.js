/*
* Primary file for the application
*
*/

//Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

// Application container
const app = {};

// Application start script
app.start = function(){
    // Start the server
    server.start();

    // Start the workers
    workers.start();
};

// Start the app
app.start();

// Export module
module.exports = app;