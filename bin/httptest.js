#!/usr/bin/env node

"use strict";

var
    opts              = require('../lib/opts'),
    httpc             = require('../lib/httpc'),
    { RequestSource } = require('../lib/request-source'),
    { RequestStream } = require('../lib/request-stream'),

    defaultOpts = {
        mode:               'template',
        number:             1,
        concurrents:        1,
        wait:               0,
        'no-stream-pause':  false,
        server:             null,
        download:           false,
        header:             []
    };

console.debug = () => {};


// Parse the command-line arguments
var
    mode = defaultOpts['mode'],
    OPTS = opts.parseOpts(process.argv, { m: 'mode', l: 'number', n: 'number', c: 'concurrents', w: 'wait', 's': 'server' }),
    validOpts = false;

// Validate the options and assume the defaults for the choosen mode
if ( mode === 'file' )
    defaultOpts.number = Infinity;

validOpts = opts.validateOpts(OPTS, ['number','concurrents','wait'], 1, defaultOpts);

// Syntax error
if ( !validOpts ) {
    console.log("Syntax error: httpsn [-m mode] [-l number] [-c concurrents] [-w wait_time] [-P] [-F url|request] [-s server_url] URL|FILE|REQUEST");
    return process.exit(0);
}

// Setup the node.js environment to allow us to make as many concurrent requests as we need
require('http').globalAgent.maxSockets  = OPTS.concurrents;
require('https').globalAgent.maxSockets = OPTS.concurrents;

// Create the request source and start it!
const rsrc = new RequestSource(OPTS);
const rstr = new RequestStream(OPTS);
rstr.plug(rsrc);
rstr.start();