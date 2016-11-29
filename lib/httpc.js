#!/usr/bin/env node

"use strict";

var
	http       = require('http'),
	https      = require('https'),
	zlib       = require('zlib');


// Parse a request
exports.parseRequest = function(reqStr, opts, handler) {

	var
		reqParts = reqStr.replace(/(\\r)?\\n/g,"\n").split("\n"),
		reqLine  = reqParts.shift(),
		headers  = {},
		host,
		url,
		req;

	if ( !reqLine.match(/^GET +(\/[^ ]*) HTTP\/[\d\.]+$/) )
		throw new Error("Can't understand the request line '"+reqLine+"'");
	url = RegExp.$1;

	// Parse the headers
	reqParts.forEach(function(headerLine){
		if ( !headerLine.match(/^([^:]+?)\s*:\s*(.*)\s*$/) )
			return;
		var
			headerValue = RegExp.$2,
			headerName  = RegExp.$1.toLowerCase();

		if ( headers[headerName] != null ) {
			if ( headers[headerName] instanceof Array )
				headers[headerName].push(headerValue);
			else
				headers[headerName] = [headers[headerName]];
		}
		else
			headers[headerName] = headerValue;
	});

	host = (opts.server || headers.host);
	if ( !host )
		throw new Error("Please specify a --server= or provide a Host: header");

	// Create a request object
	req = require('url').parse("http://"+host+url);
	req.headers = headers;

	return req;

};

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
	httpMod = url.protocol.match(/^https:/) ? https : http;
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