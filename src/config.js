var _ = require('lodash');
var result = {};

_.merge(result, {
    ptr: "true" == process.env.PTR,
    redis: {
        port: 6379,
        host: '127.0.0.1',
        options: {}
    }
});


module.exports = result;
