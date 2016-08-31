#!/usr/bin/env node

"use strict";

var
	http       = require('http'),
	https      = require('https'),
	zlib       = require('zlib');


// Just get
exports.request = function(url,opts,handler) {

	var
		args = Array.prototype.slice.call(arguments, 0),
		httpMod,
		zipDecoder,
		content = new Buffer(0),
		start = new Date(),
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
	if ( opts.headers )
		reqURL.headers = opts.headers;

	// Create a pseudo callback which destroys herself after being used
	var _handler = function(err,data,res){
		_handler = function(){};
		if ( timeout )
			clearTimeout(timeout);
		handler(err,data,res);
	};

	// Timeout ? Start counting..
	if ( opts.timeout ) {
		timeout = setTimeout(function(){
			_handler(new Error("HTTP request timeout after "+opts.timeout+" ms"),null,null);
		},opts.timeout);
	}

	// GET
	httpMod = url.match(/^https:/) ? https : http;
	var req = httpMod.get(reqURL,function(res){

		// GET data
		res.on('data',function(d){ content = Buffer.concat([content,d]); });
		res.on('end',function(){
			if ( opts.debug )
				console.log("HTTP GET: took "+(new Date()-start)+" ms");
			return _handler(null,content,res);
		});
	})
	.on('error',function(err){
		return _handler(err,null,null);
	});

};
