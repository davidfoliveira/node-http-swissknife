#!/usr/bin/env node

"use strict";

var
    modes       = require('../lib/modes'),
	opts        = require('../lib/opts'),
	httpc       = require('../lib/httpc'),

	defaultOpts = {
        mode:        'url',
        limit:       null,
        concurrents: 1,
        wait:        0
    };



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
if ( mode == 'url' || mode == 'file' ) {
    validOpts = opts.validateOpts(OPTS,['limit','concurrents','wait'],1,defaultOpts);
}

// Syntax error
if ( !validOpts ) {
    console.log("Syntax error: nodeurl.js [-m mode] [-l limit] [-c concurrents] [-w wait_time] [-P] URL|FILE");
    return process.exit(0);
}


// Run!
modes[mode](OPTS);

/*
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
*/