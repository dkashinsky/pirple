/*
* Primary file for the application
*
*/

//Dependencies
const server = require('./lib/server');

// Application container
const app = {};

// Application start script
app.start = function(){
    server.start();
};

// Start the app
app.start();

// Export module
module.exports = app;