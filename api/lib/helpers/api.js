/*
 * API helpers
 *
 */

// api error response
function apiError(message) {
    return { error: message };
};

// get the auth token
function getToken(request){
    return typeof request.headers.token == 'string' 
        ? request.headers.token 
        : false;
}

// Export module
module.exports = { 
    getToken,
    apiError
};