#!/usr/bin/env node

"use strict";


// Parse command-line options - old school way (don't want to import more libraries)
exports.parseOpts = function(args) {

    var
        opts = {},
        ptr  = 0;

    // Starting from the third argument
    for ( var x = 2 ; x < args.length ; x++ ) {
        if ( args[x] == null )
            continue;
        if ( args[x].match(/^\-\-(\w+)=(\w+)$/) )
            opts[RegExp.$1] = RegExp.$2;
        else
            opts['#'+(ptr++)] = args[x];
    }

    return opts;

};


// Validate and format command-line options
exports.validateOpts = function(opts,allowed,defaults) {

    if ( !allowed )
        allowed = ['concurrents','limit','wait'];

    if ( !defaults ) {
        defaults = {
            concurrents:    1,
            limit:          null,
            wait:           null
        };
    }

    // For each opt
    allowed.forEach(function(opt){
        if ( opts[opt] == null ) {
            opts[opt] = defaults[opts];
            return;
        }

        if ( opt == 'concurrents' ) {
            if ( opts.concurrents.match(/^\d+$/i) )
                opts.concurrents = parseInt(opts.concurrents);
            else if ( opts.concurrents.match(/^(infinite|infinity)$/i) )
                opts.concurrents = Infinity;
            else
                throw new Error("Unexpected value for 'concurrents' argument: '"+opts.concurrents+"'")
        }
        else if ( opt == 'limit' ) {
            if ( opts.limit.match(/^\d+$/i) )
                opts.limit = parseInt(opts.limit);
            else if ( opts.limit.match(/^(infinite|infinity)$/i) )
                opts.limit = null;
            else
                throw new Error("Unexpected value for 'limit' argument: '"+opts.limit+"'")
        }
        else if ( opt == 'wait' ) {
            if ( !opts.wait.match(/^\d+$/) )
                throw new Error("Unexpected value for 'wait' argument: '"+opts.wait+"'")
            opts.wait = parseInt(opts.wait);
        }
        else {
            throw new Error("Unknown option '"+opt+"'");
        }
    });

};