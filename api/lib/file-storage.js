/*
* Data storage implementation based on file system
*
*/

//dependencies
const fs = require('fs');
const { join: pathJoin } = require('path');
const { parseSafe } = require('./helpers/json');

//base path to the file storage based on the '.data' folder inside the project
const basePath = pathJoin(__dirname, './../.data');

// combine base path, category and id and get file path
function getFilePath(category, id) {
    return `${basePath}/${category}/${id}.json`;
}

// write to the file
function create(category, id, data, callback) {
    // get file path
    const filePath = getFilePath(category, id);

    //open file for writing assuming it doesn't exist
    fs.open(filePath, 'wx', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {
            // serialize the data into JSON string
            const fileContent = JSON.stringify(data);
            fs.writeFile(fileDescriptor, fileContent, (err) => {
                if (!err) {
                    fs.close(fileDescriptor, err => {
                        if (!err)
                            callback(false);
                        else
                            callback('Error closing new file');
                    })
                }
                else {
                    callback('Error writing to new file');
                }
            });
        }
        else {

            console.log(filePath);
            console.log(err);
            callback('Could not create new file, it may already exist');
        }
    });
}

// read data from the file
function read(category, id, callback) {
    const filePath = getFilePath(category, id);
    fs.readFile(filePath, 'utf8', (err, fileContent) => {
        if (!err && fileContent) {
            parseSafe(fileContent, (err, data) => {
                if (!err)
                    callback(false, data);
                else
                    callback('Error reading the data');
            });
        }
        else {
            callback('Error reading the file');
        }
    });
}

// update file data
function update(category, id, data, callback) {
    // get file path
    const filePath = getFilePath(category, id);

    //open file for writing assuming it doesn't exist
    fs.open(filePath, 'r+', (err, fileDescriptor) => {
        if (!err && fileDescriptor) {

            //cleanup existing data
            fs.ftruncate(fileDescriptor, err => {
                if (!err) {
                    // serialize the data into JSON string
                    const fileContent = JSON.stringify(data);
                    fs.writeFile(fileDescriptor, fileContent, (err) => {
                        if (!err) {
                            fs.close(fileDescriptor, err => {
                                if (!err)
                                    callback(false);
                                else
                                    callback('Error closing existing file');
                            })
                        }
                        else {
                            callback('Error writing to existing file');
                        }
                    });
                }
                else {
                    callback('Error truncating the file');
                }
            });
        }
        else {
            callback('Could not open the file for updating, it may not exist yet');
        }
    });
}

//remove record (file) from the file system
function remove(category, id, callback) {
    const filePath = getFilePath(category, id);
    fs.unlink(filePath, (err) => {
        if (!err)
            callback(false);
        else
            callback('Error deleting the file');
    });
}

//export fileStorage methods
module.exports = {
    create,
    read,
    update,
    delete: remove
};