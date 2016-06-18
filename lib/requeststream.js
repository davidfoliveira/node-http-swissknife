"use strict";

var
    httpc = require('./httpc');


function RequestStream(concurrents,maxQueueSize) {

    this.concurrents = typeof concurrents == "number" ? concurrents : Infinity;
    this.currentReqs = 0;
    this.queue = [];

};

// Push a new request
RequestStream.prototype.push = function(url,opts) {

    var
        self = this;

    // The number of concurrents was hit!
    if ( self.concurrents != Infinity && self.currentReqs >= self.concurrents ) {
        this.queue.push(url);
        return false;
    }

    // Make the request!
    self._performRequest(url,opts);

    return true;

}

RequestStream.prototype._performRequest = function(url,opts) {

    var
        self = this,
        rStart = new Date();

    // Just perform the request
    self.currentReqs++;
    return httpc.request(url,{},function(err,data,res){
        var
            spent           = ((new Date())-rStart)/1000,
            size            = (data == null) ? '-' : new Buffer(data).length,
            statusCode      = err ? 'ERR' : res.statusCode,
            errMsg          = err ? ("\""+err.toString()+"\"") : '-';

        console.log(statusCode+"\t"+spent+"\t"+size+"\t"+url+"\t"+errMsg);

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
    if ( self.queue.length == 0 )
        return;

    // Make the request!
    return self._performRequest(self.queue.shift(),opts);

};

module.exports = RequestStream;