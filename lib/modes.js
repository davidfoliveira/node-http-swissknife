"use strict";

var
    fs            = require('fs'),
    readline      = require('readline'),
    RequestStream = require('./requeststream'),
    requests;


// The URL mode (hit a single URL)
exports.url = function(opts) {

    var
        url  = opts['#0'],
        start;

    // Check if the URL is valid
    if ( !url || !url.match(/^https?:\/\//) )
        throw new Error("Invalid URL: "+url);

};


// The stdin and file modes
exports.file = function(opts) {

    var
        stream   = null,
        file     = opts['#0'],
        start;

    // Check for a file name or "-"
    if ( !file )
        throw new Error("File not specified");

    // Open the file or assign to STDIN
    if ( file == "-" )
        stream = process.stdin;
    else
        stream = fs.createReadStream(file);

    // Create a request stream
    requests = new RequestStream(opts.concurrents);

    // Read the file in lines
    var rl = readline.createInterface({
        input:    stream,
        output:   process.stdout,
        terminal: false
    });
    rl.on('line', function(line){
        line = line.replace(/^\s*|\s*$/g,"");
        if ( !line.match(/^https?:\/\/.+/) ) {
//            process.stderr.write("Discarded line '"+line+"'.\n");
            return;
        }

        // Push the request
        // - If we have a limit of concurrent requests, push it to a queue or (if specified by user request) pause the stream
        if ( !requests.push(line,opts) && opts['pause-stream'] ) {
            console.log("Pausing the stream");
            stream.pause();
        }

    });

};


// Push a request (send or queue it)
function _pushRequest(url,opts) {

    console.log("NEW REQ: ",url);
    return false;

}

// Useful stuff
function _if(cond,a,b){
    return cond ? a(b) : b();
}
