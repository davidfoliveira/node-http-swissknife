#!/usr/bin/env node

"use strict";

var
    modes       = require('../lib/modes'),
    opts        = require('../lib/opts'),
    httpc       = require('../lib/httpc'),

    defaultOpts = {
        mode:               'url',
        number:             1,
        concurrents:        1,
        wait:               0,
        'no-stream-pause':  false,
        server:             null,
        download:           false
    };



// Parse the command-line arguments
var
    mode = defaultOpts['mode'],
    OPTS = opts.parseOpts(process.argv,{m: 'mode', l: 'number', c: 'concurrents', w: 'wait', 's': 'server', 'd': 'download'}),
    validOpts = false;

// Mode defaults to url
if ( OPTS.mode ) {
    mode = OPTS.mode;
    delete OPTS.mode;
}

// Validate the options and assume the defaults for the choosen mode
if ( mode === 'file' )
    defaultOpts.number = Infinity;

validOpts = opts.validateOpts(OPTS, ['number','concurrents','wait'], 1, defaultOpts);

// Syntax error
if ( !validOpts ) {
    console.log("Syntax error: httpsn [-m mode] [-l number] [-c concurrents] [-w wait_time] [-P] [-F url|request] URL|FILE|REQUEST");
    return process.exit(0);
}

// Setup the node.js environment to allow us to make as many concurrent requests as we need
require('http').globalAgent.maxSockets  = OPTS.concurrents;
require('https').globalAgent.maxSockets = OPTS.concurrents;

// Run!
modes[mode](OPTS);
