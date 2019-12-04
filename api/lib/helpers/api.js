/*
 * API helper
 *
 */

 // API helper container
 const apiHelper = {};

 // api error response
 apiHelper.apiError = function(message){
     return { error: message };
 };

 // Export module
 module.exports = apiHelper;