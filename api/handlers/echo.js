const url = require('url');
const { trimPath } = require('../helpers/url-helper');

function echo(req, res){
    
    //get requested url and parse query
    const requestedUrl = url.parse(req.url, true);

    //get neccessary request data and normalize it
    const request = {
        method: req.method.toLowerCase(),
        path: trimPath(requestedUrl.pathname),
        query: requestedUrl.query,
        payload: ''
    };

    //switch request to flowing mode to read request data
    const body = [];
    req.on('data', (chunk) => body.push(chunk));

    //respond once request is read completely
    req.on('end', () => {

        //convert body to string
        request.payload = Buffer.concat(body).toString('utf-8');

        //echo request in JSON format
        res.writeHead(200, {
            'Content-Type': 'application/json'
        });
        res.write(JSON.stringify(request));
        res.end();
    });
}

module.exports = echo;