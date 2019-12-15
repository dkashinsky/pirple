/*
 * Twilio API helper to send SMS messages
 *
 */

// Dependencies
const config = require('../config');
const https = require('https');
const querystring = require('querystring');
const { Validator, minLength, maxLength } = require('./validation');
const { phoneValidator } = require('../models/user');

// Sends sms via twilio API
function sendSMS(phone, message, callback) {
    // Validate inputs
    const validator = new Validator({
        phone: [phoneValidator],
        message: [minLength(1), maxLength(1600)]
    });
    const validationResult = validator.validate({ phone, message });

    if (validationResult.isValid()) {
        // get normalized data
        const data = validationResult.getData();

        // Configure the request payload
        const payload = {
            'From': config.twilio.fromPhone,
            'To': '+1' + data.phone,
            'Body': data.message
        };

        // Configure the request details
        const stringPayload = querystring.stringify(payload);
        const requestDetails = {
            'protocol': 'https:',
            'hostname': 'api.twilio.com',
            'method': 'POST',
            'path': `/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`,
            'auth': `${config.twilio.accountSid}:${config.twilio.authToken}`,
            'headers': {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };

        // Instantiate the request object
        const request = https.request(requestDetails, (response) => {
            // Grab the response status
            const { statusCode } = response;
            // Call back successfully if the request wend through
            if (statusCode == 200 || statusCode == 201) {
                callback(false);
            } else {
                console.log(response);
                callback(`Status code: ${statusCode}`);
            }
        });

        // Subscribe to the error event so it does not get thrown
        request.on('error', (err) => {
            console.log(err);
            callback(err);
        })

        // add the payload
        request.write(stringPayload);

        // send the request off
        request.end();
    } else {
        callback('Given parameters are missing or invalid')
    }
}

// Module export
module.exports = {
    sendSMS
}