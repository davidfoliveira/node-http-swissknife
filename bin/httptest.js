#!/usr/bin/env node

"use strict";

var
    fs          = require('fs'),
    async       = require('async'),
    readline    = require('readline'),
	opts        = require('../lib/opts'),
	httpc       = require('../lib/httpc'),

	defaultOpts = {
            mode:        'url',
            limit:       null,
            concurrents: 1,
            wait:        0
        };


function _if(cond,a,b){
	return cond ? a(b) : b();
}




// Parse the command-line arguments
var
    mode = defaultOpts['mode'],
    OPTS = opts.parseOpts(process.argv,{m: 'mode', l: 'limit', c: 'concurrents', w: 'wait'}),
    validOpts = false;

// Mode defaults to url
if ( OPTS.mode ) {
    mode = OPTS.mode;
    delete OPTS.mode;
}

// Validate the options according to the choosen mode
if ( mode == 'url' ) {
    validOpts = opts.validateOpts(OPTS,['limit','concurrents','wait'],1,defaultOpts);
}
else if ( mode == 'file' ) {
    validOpts = opts.validateOpts(OPTS,['limit','concurrents','wait'],1,defaultOpts);
}
else if ( mode == 'stdin' ) {
    validOpts = opts.validateOpts(OPTS,['limit','concurrents','wait'],0,defaultOpts);
}

// Syntax error
if ( !validSyntax ) {
    console.log("Syntax error: nodeurl.js URL");
    return process.exit(0);
}



// Run!

// URL mode
if ( mode == 'url' ) {

    var
        url  = opts['#0'],
        start;

    // Check if the URL is valid
    if ( !url || !url.match(/^https?:\/\//) )
        throw new Error("Invalid URL: "+url);

}
else if ( mode == 'file' || mode == 'stdin' ) {

    var
        stream   = null,
        start;

    if ( mode == 'file' ) {
        var
            file = opts['#0'];

        if ( !file )
            throw new Error("File not specified");

        // Open the file (or fail)
        stream = fs.createReadStream(file,"r");
    }
    else
        fd = process.stdin;

    // 

    // Read the file in lines
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', function(line){
        console.log(line);
    })

}


console.log("Starting...");
start = new Date();
async.mapLimit(urls,opts.concurrents,
        function(url,next) {
                // Get
                var rStart = new Date();
                request(url,{},function(err,data,res){
                        var
                                spent           = ((new Date())-rStart)/1000,
                                size            = (data == null) ? '-' : new Buffer(data).length,
                                statusCode      = err ? 'ERR' : res.statusCode,
                                errMsg          = err ? ("\""+err.toString()+"\"") : '-';

                        console.log(statusCode+"\t"+spent+"\t"+size+"\t"+url+"\t"+errMsg);
			_if(opts['wait'],
				function(nextReq){
					setTimeout(nextReq,opts['wait']);
				},
				function(){
		                        return next(null,statusCode);					
				}
			);
                });
        },
        function(err,res){
                var spent = (new Date()-start)/1000;
                console.log("Performed:    "+res.length+" requests in "+spent+ " s");
                var secPerReq = spent / res.length;
                if ( secPerReq < 1 ) {
                        var reqPerSec = res.length/spent;
                        console.log("Reqs/second:  "+reqPerSec+(urls.length < opts.concurrents?" (estimate)":""));
                }
                else
                        console.log("Seconds/req:  "+secPerReq);
                process.exit(0);
        }
);
