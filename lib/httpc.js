#!/usr/bin/env node

"use strict";

var
	http       = require('http'),
	https      = require('node:https'),
	zlib       = require('zlib');

// Just get
exports.request = function(url,opts,handler) {

	var
		args = Array.prototype.slice.call(arguments, 0),
		httpMod,
		start = new Date(),
		dataSize = 0,
		timeout = null,
		reqURL;

	url = args.shift()    || null;
	handler = args.pop()  || null;
	opts = args.shift()   || { followRedirects: 3 };
	if ( !url )
		throw new Error("No URL to GET");
	if ( !handler )
		throw new Error("No callback");
	reqURL = require('url').parse(url);
	if ( opts.headers && Object.keys(opts.headers).length > 0 )
		reqURL.headers = opts.headers;

	// Create a pseudo callback which destroys herself after being used
	var _handler = function(err,dataSize,res){
		_handler = function(){};
		if ( timeout )
			clearTimeout(timeout);
		handler(err, dataSize, res);
	};

	// Timeout ? Start counting..
	if ( opts.timeout ) {
		timeout = setTimeout(function(){
			_handler(new Error("HTTP request timeout after "+opts.timeout+" ms"),null,null);
		},opts.timeout);
	}

	// GET
	httpMod = reqURL.protocol.match(/^https:/) ? https : http;
	reqURL.rejectUnauthorized = false;
	reqURL.headers.host = reqURL.host;
	var req = httpMod.request(reqURL, function(res){
		// GET data
		res.on('data',function(d){ dataSize += d.length; });
		res.on('end',function(){
			if ( opts.debug )
				console.log("HTTP GET: took "+(new Date()-start)+" ms");
			return _handler(null,dataSize,res);
		});
	})
	.on('error',function(err){
		return _handler(err,null,null);
	});

	if ( reqURL.data )
		req.end(reqURL.data);
	else
		req.end();
};
