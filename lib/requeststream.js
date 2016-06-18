"use strict";

var
    httpc = require('./httpc');


function RequestStream(concurrents) {

    this.concurrents = concurrents;
    this.currentReqs = 0;
    this.queue = [];

};

RequestStream.prototype.push = function(url,opts) {

    var
        self = this;

    // The number of concurrents was hit!
    if ( self.concurrents != null && self.concurrents != Infinity && self.currentReqs >= self.concurrents ) {
        console.log("QUEUE");
        this.queue.push(url);
        return;
    }

    // Perform the request
    request(url,{},function(err,data,res){
        var
            spent           = ((new Date())-rStart)/1000,
            size            = (data == null) ? '-' : new Buffer(data).length,
            statusCode      = err ? 'ERR' : res.statusCode,
            errMsg          = err ? ("\""+err.toString()+"\"") : '-';

        console.log(statusCode+"\t"+spent+"\t"+size+"\t"+url+"\t"+errMsg);
        _if(opts['wait'],
            function(nextReq){
                setTimeout(nextReq,opts['wait']);
            },
            function(){
                return next(null,statusCode);                   
            }
        );
    });

};


module.exports = RequestStream;