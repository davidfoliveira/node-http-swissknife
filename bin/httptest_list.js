#!/usr/bin/env node

"use strict";

var
	http       = require('http'),
	https      = require('https'),
	fs         = require('fs'),
	async      = require('async'),
	fileData,
	start,
	urls = [];

// Parse command-line options - old school way (don't want to import more libraries)
var parse_opts = function(args) {

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

// Just get
var request = function(url,opts,handler) {

	var
		args = Array.prototype.slice.call(arguments, 0),
		httpMod,
		zipDecoder,
		content = "",
		start = new Date(),
		timeout = null,
		reqURL;

	url = args.shift()    || null;
	handler = args.pop()  || null;
	opts = args.shift()   || { followRedirects: 3, charsetEncoding: "utf-8" };
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
//		if ( res.statusCode > 400 )
//			return _handler(null,null,res);
/*
		if ( res.statusCode >= 300 && res.statusCode < 400 ) {
			if ( res.headers['location'] != null && res.headers['location'].toString().replace(/^[\s\r\n]*|[\s\r\n]*$/g,"") && opts.followRedirects ) {
				opts.followRedirects--;
				res.headers['location'] = require('url').resolve(reqURL,res.headers['location'].toString());
				return exports._get(res.headers['location'],_handler);
			}
			return _handler(new Error("Found redirect without Location header"),null,res);
		}
*/
		// Watch content encoding
		if ( res.headers['content-encoding'] ) {
			var enc = res.headers['content-encoding'].toString().toLowerCase().replace(/^\s*|\s*$/g,"");
			if ( enc == "gzip" )
				zipDecoder = zlib.createGunzip();
			else if ( enc == "deflate" )
				zipDecoder = zlib.createInflate();
			else
				return _handler(new Error("Unsupported document encoding '"+enc+"'"),null);
			res.pipe(zipDecoder);
		}

		// GET data
		(zipDecoder || res).setEncoding(opts.charsetEncoding || "utf-8");
		(zipDecoder || res).on('data',function(d){ content += d.toString(); });
		(zipDecoder || res).on('end',function(){
			if ( opts.debug )
				console.log("HTTP GET: took "+(new Date()-start)+" ms");
			return _handler(null,content,res);
		});
	})
	.on('error',function(err){
		return _handler(err,null,null);
	});

};

function _if(cond,a,b){
	return cond ? a(b) : b();
}


// Parse the query string arguments
var
	opts = parse_opts(process.argv),
	file  = opts['#0'];

for ( var opt in opts.concurrents ) {
	if ( !opt.match(/^(concurrents|limit|\d+)$/) )
		throw new Error("Unknown option '"+opt+"'");
}

// Defaults
if ( !opts.concurrents )
	opts.concurrents = 1;

if ( !file ) {
	console.log("Syntax error: httptest_list.js urllist_file.txt");
	return process.exit(0);
}

// Read the file
urls = fs.readFileSync(file).toString().split("\n").filter(function(url){return url.match(/^https?:\/\//)});

// Splice the list
if ( opts.limit ) {
	opts.limit = parseInt(opts.limit);
	urls = urls.splice(0,opts.limit);
}


// Run the test
console.log("Will test "+urls.length+" urls");
console.log("Starting...");
start = new Date();
async.mapLimit(urls,opts.concurrents,
	function(url,next) {
		// Get
		var rStart = new Date();
		request(url,{},function(err,data,res){
			var
				spent		= ((new Date())-rStart)/1000,
				size		= (data == null) ? '-' : new Buffer(data).length,
				statusCode	= err ? 'ERR' : res.statusCode,
				errMsg		= err ? ("\""+err.toString()+"\"") : '-';

			console.log(statusCode+"\t"+spent+"\t"+size+"\t"+url+"\t"+errMsg);
			return next(null,statusCode);
		});
	},
	function(err,res){
		var spent = (new Date()-start)/1000;
		console.log("Performed:    "+res.length+" in "+spent);
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
