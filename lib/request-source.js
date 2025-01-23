const EventEmitter = require('node:events');
const readline = require('readline');


class RequestSource extends EventEmitter {
  constructor(opts) {
    super();
    this.opts = opts;
    this.mode = this.opts.mode == 'file' ? 'file' : 'template';
    this._stream = null;
    this._ended = false;
  }

  start() {
    if (this.mode === 'template') {
      this._startTemplate();
    }
    else if (this.mode === 'file') {
      this._startFile();
    }
  }

  _startFile() {
    let pushed   = 0;
    let finito   = false;

    // Check for a file name or "-"
    const file = this.opts['#0'];
    if ( !file )
        throw new Error("File not specified");

    // Open the file or assign to STDIN
    this._stream = (file === "-") ? process.stdin : fs.createReadStream(file);

    // Read the file in lines
    this._rl = readline.createInterface({
        input:    this._stream,
        output:   process.stdout,
        error:    process.stderr,
        terminal: false
    });
    this._rl.on('line', (line) => {
        // Check if the line is an URL
        line = line.replace(/^\s*|\s*$/g,"");
        if (!line) return;

        let req;
        if (line.match(/^https?:\/\/.+/) ) {
          req = require('url').parse(line);
        }
        else if (line.match(/(GET|POST|PUT|DELETE|PATCH|HEAD) +([^ ]+) +HTTP\//i)) {
          req = RequestSource._parseRequest(line, { server: this.opts.server });
        }
        else {
          console.log(`ERRO: Unable to parse request: '${line}'`);
          return;
        }
        // Push the request
        this.emit('request', req);

        // Limit the number of requests
        if (this.opts.number != null && ++pushed >= this.opts.number) {
          this._ended = true;
          this._stream.end();
        }
    });
    this._rl.on('close', () => {
      this._stream.end();
      this._ended = true;
    });
  }

  pause() {
    this._rl.pause();
  }

  resume() {
    this._rl.resume();
  }

  // Parse a request
  static _parseRequest(reqStr, opts, handler) {
    var
      method = "GET",
      reqParts = RequestSource._unQuote(reqStr).split("\n"),
      reqLine  = reqParts.shift(),
      headers  = {},
      host,
      url,
      data = null,
      req;

    if ( !reqLine.match(/^(GET|POST|PUT|DELETE|PATCH|HEAD) +(\/[^ ]*) HTTP\/[\d\.]+$/) )
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

    // Before we proceed, confirm the data length matches with the content-length header
    if (req.headers['content-length']) {
      if ( data != null && req.headers['content-length'] != null && parseInt(req.headers['content-length']) !== data.length) {
        console.debug(`WARN: Content-length (${req.headers['content-length']}) header and payload (${data.length}) differ. Assuming data length.`);
        req.headers['content-length'] = data.length;
      }
    }

    return req;
  }

  // Unquote a request
  static _unQuote(data) {
    return data.replace(/(\\r)?\\n/g,"\n").replace(/\\/g, "");
  }
}


module.exports = {
  RequestSource,
};