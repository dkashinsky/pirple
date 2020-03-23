/**
 * Worker-related tasks
 * 
 */

// Dependencies
const path = require('path');
const fs = require('fs');
const fileStorage = require('./file-storage');
const http = require('http');
const https = require('https');
const url = require('url');
const { Validator, optional, from, minLength, between, notEmptyArray, greaterThan } = require('./helpers/validation');
const { tokenValidator } = require('./models/token');
const { phoneValidator } = require('./models/user');
const twilio = require('./helpers/twilio');

// Instantiate the worker object
const workers = {};

// Timer to execute the worker-process once per minute
workers.loop = function(){
    setInterval(function() {
        workers.gatherAllChecks();
    }, 1000 * 60);
};

// Lookup all the checks, get their data, send to a validator
workers.gatherAllChecks = function() {
    fileStorage.list('checks', (err, checks) => {
        if (!err && checks && checks.length > 0) {
            checks.forEach((check) => {
                // Read in the check data
                fileStorage.read('checks', check, (err, originalCheckData) => {
                    if (!err && originalCheckData) {
                        // Pass it to the check validator and let that function continue or log errors as needed
                        workers.validateCheckData(originalCheckData);
                    }
                    else {
                        console.log("Error reading one of the check's data");
                    }
                });
            });
        }
        else {
            console.log("Error: Could not find any checks to process");
        }
    });
}

// Sanity-check the check-data
workers.validateCheckData = function(originalCheckData) {
    const validator = new Validator({
        id: [tokenValidator],
        userPhone: [phoneValidator],
        protocol: [from(['http', 'https'])],
        url: [minLength(4)],
        method: [from(['get', 'post', 'put', 'delete'])],
        successCodes: [notEmptyArray('number')],
        timeoutSeconds: [between([1, 5], true)],

        // keys that may not be set
        state: [optional, from(['up', 'down'])],
        lastChecked: [optional, greaterThan(0)],
    });
    const validationResult = validator.validate(originalCheckData);

    // If all the checks pass, pass the data along to the next step in the process
    if (validationResult.isValid()) {
        // get data
        const checkData = validationResult.getData();

        // Set the keys that may not be set (if the workers have never seen this check before)
        checkData.state = checkData.state || 'down';
        checkData.lastChecked = checkData.lastChecked || false; // not sure we need it here

        // Perform the check
        workers.performCheck(checkData);
    }
    else {
        console.log("Error: One of the checks is not properly formatted. Skipping it.");
    }
}

// Perform the check, send the original check data and the outcome of the check processm to the next step of the process
workers.performCheck = function(originalCheckData) {
    // prepare the initial check outcome
    const checkOutcome = {
        'error': false,
        'responseCode': false
    };

    // mark that the outcome has not been send yet
    let outcomeSent = false;

    // Parse the hostname and the path out of the original check data
    const parsedUrl = url.parse(`${originalCheckData.protocol}://${originalCheckData.url}`, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path;

    // Construct the request
    const requestDetails = {
        'protocol' : originalCheckData.protocol + ':',
        'hostname': hostName,
        'method': originalCheckData.method.toUpperCase(),
        'path': path,
        'timeout': originalCheckData.timeoutSeconds * 1000
    };

    // Instantiate the request object
    const moduleToUse = originalCheckData.protocol === 'http' ? http : https;
    const req = moduleToUse.request(requestDetails, (res) => {
        // Grab the status of the sent request
        const status = res.statusCode;

        // Update the check outcome and pass the data along
        checkOutcome.responseCode = status;
        if (!outcomeSent) {
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', (error) => {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': error
        }

        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // Bind on the timeout event
    req.on('timeout', () => {
        // Update the checkOutcome and pass the data along
        checkOutcome.error = {
            'error': true,
            'value': 'timeout'
        }

        if(!outcomeSent){
            workers.processCheckOutcome(originalCheckData, checkOutcome);
            outcomeSent = true;
        }
    });

    // End the request
    req.end();
}

// Process the check outcome, update the check data as needed, trigger an alert if needed
// Special logic for accomodating a check that has never been tested before (don't alert on that one)
workers.processCheckOutcome = function(originalCheckData, checkOutcome) {
    // Decide of the check is considered up or down
    const state = !checkOutcome.error 
        && checkOutcome.responseCode 
        && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
    
    // Decide if an alert is warranted
    const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state;

    // Update the check data
    const newCheckData = originalCheckData;
    newCheckData.state = state;
    newCheckData.lastChecked = Date.now();

    // Save the updates
    fileStorage.update('checks', newCheckData.id, newCheckData, (err) => {
        if (!err) {
            // Send the new check data to the next phase on the process if needed
            if (alertWarranted) {
                workers.alertUserToStatusChange(newCheckData);
            }
            else {
                console.log("Check outcome has not changed, no alert needed");
            }
        } 
        else {
            console.log("Error trying to save updates to one of the checks");
        }
    });
}

// Alert the user as to a change in their check status
workers.alertUserToStatusChange = function(newCheckData) {
    const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
    // temporary alert to console
    console.log(msg);
    // twilio.sendSMS(newCheckData.userPhone, msg, (err) => {
    //     if (!err) {
    //         console.log("Success: User was alerted to a status change in theiur check, via SMS:", msg);
    //     }
    //     else {
    //         console.log("Error:  Could not send sms alert to user who had a state change in their change");
    //     }
    // });
}

// Start script
workers.start = function() {
    // Execute all the checks immediately
    workers.gatherAllChecks();

    // Call the loop so the checks will execute later on
    workers.loop();
};

// Export module 
module.exports = workers;