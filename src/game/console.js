var _ = require('lodash'),
    messages = {},
    commandResults = {};

exports.makeConsole = function(id, sandboxedFunctionWrapper) {
    messages[id] = [];
    commandResults[id] = [];
    return Object.create(null, {
        log: {
            writable: true,
            configurable: true,
            value: sandboxedFunctionWrapper(function() {

                if(typeof self != 'undefined' && self.navigator.userAgent) {
                    self['console']['log'].apply(console, arguments);
                }

                messages[id].push(
                _.map(arguments, (i) => {
                    if(i && i.toString) return i.toString();
                    if(typeof i === 'undefined') return 'undefined';
                    return JSON.stringify(i);
                }).join(' '));
            })
        },
        commandResult: {
            value: sandboxedFunctionWrapper(function(message) {
                if(typeof self != 'undefined' && self.navigator.userAgent) {
                    self['console']['log'].call(console, message);
                }
                commandResults[id].push(String(message));
            })
        }
    });
};

exports.getMessages = function(id) {
    var result = messages[id];
    messages[id] = [];
    return result;
};

exports.getCommandResults = function(id) {
    var result = commandResults[id];
    commandResults[id] = [];
    return result;
};