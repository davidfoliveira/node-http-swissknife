"use strict";

var
    fs            = require('fs'),
    readline      = require('readline'),
    RequestStream = require('./requeststream'),
    httpc         = require('./httpc'),
    requests;


// The URL mode (hit a single URL)
exports.url = function(opts) {

    var
        url  = opts['#0'],
        start,
        rStart,
        totalTimeSpent = 0;

    // Check if the URL is valid
    if ( !url )
        throw new Error("The URL was not supplied");
    if ( url.match(/^https?:\/\/.+/) )
        url = require('url').parse(url);
    else if ( url.match(/^GET +([^ ]+) +HTTP\//i) )
        url = httpc.parseRequest(url);
    else
        throw new Error("Invalid URL: "+url);

    // For loop with a limit on parallel
    return _forLimit(opts.number,opts.concurrents,
        function(x,next){

            // Perform the request
            rStart = new Date();
            return httpc.request(url,{},function(err,data,res){
                var
                    spent           = ((new Date())-rStart)/1000,
                    size            = (data == null) ? '-' : new Buffer(data).length,
                    statusCode      = err ? 'ERR' : res.statusCode,
                    errMsg          = err ? ("\""+err.toString()+"\"") : '-';

                console.log(statusCode+"\t"+spent+"\t"+size+"\t"+(typeof(url) == "string" ? url : require('url').format(url))+"\t"+errMsg);
                totalTimeSpent += spent;

                // Do we have to wait between requests?
                if ( opts.wait )
                    return setTimeout(function(){
                        return next();
                    },opts.wait);

                // Nope!
                return next();
            });
        },
        function(err,res){
            _printFinalReport(res.length,totalTimeSpent,opts.concurrents);
            return process.exit(0);
        }
    );

};


// The stdin and file modes
exports.file = function(opts) {

    var
        stream   = null,
        file     = opts['#0'],
        pushed   = 0,
        finito   = false,
        start,
        req;

    // Check for a file name or "-"
    if ( !file )
        throw new Error("File not specified");

    // Open the file or assign to STDIN
    if ( file === "-" )
        stream = process.stdin;
    else
        stream = fs.createReadStream(file);

    // Create a request stream
    requests = new RequestStream(opts.concurrents);
    requests.on('drain', function(){
        if ( stream.isPaused() )
            stream.resume();
    });
    requests.on('complete', function(){
        if ( finito ) {
            _printFinalReport(requests.done,requests.totalTimeSpent,opts.concurrents);
            return process.exit(0);
        }
    });

    // Read the file in lines
    var rl = readline.createInterface({
        input:    stream,
        output:   process.stdout,
        terminal: false
    });
    rl.on('line', function(line){
        if ( finito )
            return;

        // Check if the line is an URL
        line = line.replace(/^\s*|\s*$/g,"");
        if ( !line )
            return;
        if ( line.match(/^https?:\/\/.+/) )
            req = require('url').parse(line);
        else if ( line.match(/^GET +([^ ]+) +HTTP\//i) )
            req = httpc.parseRequest(line, {server: opts.server});
        else
            return;

        // Push the request
        // - If we have a limit of concurrent requests, push it to a queue or (if specified by user request) pause the stream
        if ( !requests.push(req,opts) && !opts['no-stream-pause'] && !stream.isPaused() )
            stream.pause();

        // Limit the number of requests
        if ( opts.number != null && ++pushed >= opts.number ) {
            finito = true;
            stream.close();
        }
    });
    rl.on('close',function(){
        finito = true;
    });

};


// Print the final report
function _printFinalReport(reqs,spent,concurrents) {

    var
        secPerReq = spent / reqs,
        reqPerSec;

    console.log("Performed:    "+reqs+" requests in "+spent+ " s");
    if ( secPerReq < 1 ) {
        reqPerSec = reqs/spent;
        console.log("Reqs/second:  "+reqPerSec+(reqs < concurrents?" (estimate)":""));
    }
    else
        console.log("Seconds/req:  "+secPerReq);

}

/*
 * Useful stuff
 */

// A for loop which supports parallel tasks
function _forLimit(iters,parallel,fn,callback) {

    var
        ran = 0,
        rset = [],
        fnCb = function(err,res){
            if ( err )
                return callback(err,rset);
            rset.push(res);
            return (ran < iters) ? setImmediate(function(){fn(ran++,fnCb)}) : callback(null,rset);
        };

    // Run as many as we can in parallel
    for ( var p = 0 ; p < parallel && p < iters ; p++ ) {
        fn(ran++,fnCb);
    }

}