"use strict";

var
    util    = require('util'),
    { EventEmitter }  = require('node:events'),
    httpc   = require('./httpc');


class RequestStream extends EventEmitter {
  constructor(opts) {
    super();
    this.opts = opts;
    this.maxConcur = typeof opts.concurrents == "number" ? opts.concurrents : Infinity;

    this.currentReqs = 0;
    this.ongoing = { };

    this.started = null;
    this.paused = true;

    // Stats
    this.done = 0;
    this.totalTimeSpent = 0;
  }

  plug(source) {
    this._source = source;
    this._source.on('request', (r) => {
      this.push(r)
      if (typeof this.maxConcur != Infinity && this.currentReqs >= this.maxConcur) {
        this._source.pause();
        this.paused = true;
      }
    });
  }

  start() {
    this.paused = false;
    this._source.start();
  }

  push(req) {
    this._performRequest(req);
  }

  _performRequest(req, opts) {
    const rStart = new Date();

    // Just perform the request
    console.debug("INFO: Sending req: ", req.path);
    this.currentReqs++;
    return httpc.request(req, { headers: this.opts.header || {} }, (err, dataSize, res) => {
        const spent = ((new Date())-rStart) / 1000;
        const size  = (dataSize == null) ? '-' : dataSize;
        const statusCode = err ? 'ERR' : res.statusCode;
        const errMsg = err ? ("\""+err.toString()+"\"") : '-';

        console.log(statusCode+"\t"+spent+"\t"+size+"\t"+(typeof(req) == "string" ? req : require('url').format(req))+"\t"+errMsg);

        // Do we have to wait between requests?
        if ( this.opts.wait ) {
            return setTimeout(function(){
                this.currentReqs--;
                this._nextRequest();
            }, this.opts.wait);
        }
        else {
          // Nope!
          this.currentReqs--;
          return this._nextRequest();
        }
    });
  }

  // Handle the next request (if there is some)
  _nextRequest() {
    if (this.paused) {
        this.paused = false;
        this._source.resume();
    }
  }
}


module.exports = {
  RequestStream,
};
