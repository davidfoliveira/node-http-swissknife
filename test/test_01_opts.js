var
    opts = require('../lib/opts');


console.log(opts.parseOpts(process.argv,{l:'limit'}));
