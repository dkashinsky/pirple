/*
 * JSON helpers
 *
 */

// Container 
const helpers =  {};

// JSON parse with callback
helpers.parseSafe = function(str, callback){
    try {
        const parsedObject = JSON.parse(str);
        callback(false, parsedObject);
    } 
    catch (ex) 
    {
        callback(ex);
    }
};

// Export module
module.exports = helpers;