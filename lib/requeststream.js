"use strict";

var
    util    = require('util'),
    events  = require('events'),
    httpc   = require('./httpc');


function RequestStream(concurrents,maxQueueSize) {

    this.concurrents = typeof concurrents == "number" ? concurrents : Infinity;
    this.currentReqs = 0;
    this.queue = [];

    // Stats
    this.done = 0;
    this.totalTimeSpent = 0;

};
util.inherits(RequestStream, events.EventEmitter);


// Push a new request
RequestStream.prototype.push = function(url,opts) {

    var
        self = this;

    // The number of concurrents was hit!
    if ( self.concurrents != Infinity && self.currentReqs >= self.concurrents ) {
        self.queue.push(url);
        return false;
    }

    // Make the request!
    self._performRequest(url,opts);

    return true;

}

RequestStream.prototype._performRequest = function(url,opts) {

    var
        self = this,
        rStart = new Date(),
        _url = require('url').parse(require('url').format(url)),
        x = 0;

    // Process the URL template
    ['path', 'search', 'query', 'href'].forEach(function(prop){
        _url[prop] = _url[prop].replace(/%7B%7Bseq%7D%7D/g, x);
    });

    // Just perform the request
    self.currentReqs++;
    self.done++;
    return httpc.request(url,{},function(err,dataSize,res){
        var
            spent           = ((new Date())-rStart)/1000,
            size            = (dataSize == null) ? '-' : dataSize,
            statusCode      = err ? 'ERR' : res.statusCode,
            errMsg          = err ? ("\""+err.toString()+"\"") : '-';

        console.log(statusCode+"\t"+spent+"\t"+size+"\t"+(typeof(url) == "string" ? url : require('url').format(url))+"\t"+errMsg);
        self.totalTimeSpent += spent;

        // Do we have to wait between requests?
        if ( opts.wait )
            return setTimeout(function(){
                self.currentReqs--;
                self._nextRequest(opts);
            },opts.wait);

        // Nope!
        self.currentReqs--;
        return self._nextRequest(opts);
    });

};

// Handle the next request (if there is some)
RequestStream.prototype._nextRequest = function(opts) {

    var
        self = this;

    // Do we have something in the queue? Nah? Done!
    if ( self.queue.length == 0 ) {
        self.emit('drain');
        if ( self.currentReqs == 0 )
            self.emit('complete');
        return;
    }

    // Make the request!
    return self._performRequest(self.queue.shift(),opts);

};

module.exports = RequestStream;
