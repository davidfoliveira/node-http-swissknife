"use strict";

var
    optAliases = {
        'l': 'number',
        'c': 'concurrents',
        'w': 'wait',
        'S': 'no-stream-pause',
        's': 'server',
        'F': 'format'
    },
    optType = {
        'header': 'object',
        'no-stream-pause': 'boolean'
    },
    optParser = {
        'header': function(val) {
            if ( val.match(/^([^:]+):(.*)$/) )
                return { name: RegExp.$1, value: RegExp.$2 }
            return { name: val };
        }
    }

// Parse command-line options - old school way (don't want to import more libraries)
exports.parseOpts = function(args, extraAliases) {
    const opts = {};

    // Assume default option aliases
    const aliases = Object.assign({}, optAliases, extraAliases);

    // Starting from the third argument
    let ptr = 0;
    for (let x = 2 ; x < args.length; x++) {
        if ( args[x] == null )
            continue;
        if ( args[x].match(/^\-\-(\w[\w\-]*)=(.+)$/) ) {
            var
                opt = RegExp.$1,
                val = RegExp.$2;
            _setValue(opts, RegExp.$1, RegExp.$2);
        }
        else if ( args[x].match(/^\-{1,2}(\w+)$/) ) {
            var opt = aliases[RegExp.$1] || RegExp.$1;
            if ( optType[opt] == 'boolean' ) {
                opts[opt] = true;
                continue;
            }
            if ( args.length <= x+1 )
                throw new Error("Expecting an argument for option '"+RegExp.$1+"'");
            _setValue(opts, aliases[RegExp.$1], args[++x]);
        }
        else
            _setValue(opts, '#'+(ptr++), args[x]);
    }

    return opts;

};

function _setValue(opts, name, value) {
    // Initialize the option
    if ( opts[name] == null )
        opts[name] = _newValue(name);

    // Create the value
    if ( optParser[name] )
        value = optParser[name](value);

    if ( typeof(opts[name]) == "object" ) {
        if ( typeof(value) == "object" && value.name )
            opts[name][value.name] = value.value;
    }
    else if ( opts[name] instanceof Array ) {
        opts[value.name].push(value);
    }
    else
        opts[name] = value;
}

function _newValue(name) {
    if ( optType[name] == 'boolean' )
        return true;
    if ( optType[name] == 'object' )
        return {};
    if ( optType[name] == 'list' )
        return [];
}


// Validate and format command-line options
exports.validateOpts = function(opts,allowed,strArgNum,defaults) {

    if ( !allowed )
        allowed = ['concurrents','number','wait'];

    if ( !defaults ) {
        defaults = {
            concurrents:    1,
            number:          1,
            wait:           null
        };
    }

    // For each opt
    allowed.forEach(function(opt){
        if ( opts[opt] == null ) {
            opts[opt] = defaults[opts];
            return;
        }

        if ( opt === 'mode' ) {
            if ( !opts.mode.match(/^(file|url)$/) )
                throw new Error("Unknown/unsupported mode '"+opts.mode+"'");
        }
        else if ( opt === 'concurrents' ) {
            if ( opts.concurrents.match(/^\d+$/i) )
                opts.concurrents = parseInt(opts.concurrents);
            else if ( opts.concurrents.match(/^(infinite|infinity)$/i) )
                opts.concurrents = Infinity;
            else
                throw new Error("Unexpected value for 'concurrents' argument: '"+opts.concurrents+"'")
        }
        else if ( opt === 'number' ) {
            if ( opts.number.match(/^\d+$/i) )
                opts.number = parseInt(opts.number);
            else if ( opts.number.match(/^(infinite|infinity)$/i) )
                opts.number = Infinity;
            else
                throw new Error("Unexpected value for 'number' argument: '"+opts.number+"'")
        }
        else if ( opt === 'wait' ) {
            if ( !opts.wait.match(/^\d+$/) )
                throw new Error("Unexpected value for 'wait' argument: '"+opts.wait+"'")
            opts.wait = parseInt(opts.wait);
        }
        else {
            throw new Error("Unknown option '"+opt+"'");
        }
    });

    // Check the defaults
    Object.keys(defaults).forEach(function(opt){
        if ( typeof opts[opt] == "undefined" )
            opts[opt] = defaults[opt];
    });

    // Check the string arguments
    for ( var x = 0 ; x < strArgNum ; x++ ) {
        if ( opts['#'+x] == null || opts['#'+x] === '' )
            return false;
    }

    return true;

};
