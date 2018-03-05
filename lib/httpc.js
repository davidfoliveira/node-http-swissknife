#!/usr/bin/env node

"use strict";

var
	http       = require('http'),
	https      = require('https'),
	zlib       = require('zlib');


// Unquote a request
function _unQuote(data) {
	return data.replace(/(\\r)?\\n/g,"\n").replace(/\\/g, "");
}

// Parse a request
exports.parseRequest = function(reqStr, opts, handler) {
	var
		method = "GET",
		reqParts = _unQuote(reqStr).split("\n"),
		reqLine  = reqParts.shift(),
		headers  = {},
		host,
		url,
		data = null,
		req;

	if ( !reqLine.match(/^(GET|POST) +(\/[^ ]*) HTTP\/[\d\.]+$/) )
		throw new Error("Can't understand the request line '"+reqLine+"'");
	method = RegExp.$1;
	url = RegExp.$2;

	// Parse the headers
	while ( reqParts.length > 0 ) {
		var
			headerLine = reqParts.shift();

		if ( headerLine == '' )
			break;
		if ( !headerLine.match(/^([^:]+?)\s*:\s*(.*)\s*$/) )
			continue;
		var
			headerValue = RegExp.$2,
			headerName  = RegExp.$1.toLowerCase();

		if ( headerName.match(/accept/) )
			continue;
		if ( headers[headerName] != null ) {
			if ( headers[headerName] instanceof Array )
				headers[headerName].push(headerValue);
			else
				headers[headerName] = [headers[headerName]];
		}
		else
			headers[headerName] = headerValue;
	}

	if ( method.toUpperCase() == "POST" && reqParts.length > 0 ) {
		data = "";
		reqParts.forEach(function(line){
			data += line + "\n";
		});
		data = data.substr(0, data.length - 1);
	}

	// Set the host
	host = (opts.server || headers.host);
	if ( !host )
		throw new Error("Please specify a --server= or provide a Host: header");

	// Create a request object
	if ( host.match(/^https:\/\//) )
		req = require('url').parse(host+url);
	else
		req = require('url').parse("http://"+host+url);

	req.method = method;
	req.headers = headers;
	req.data = data;
	return req;

};

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
	httpMod = url.protocol.match(/^https:/) ? https : http;
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
};
