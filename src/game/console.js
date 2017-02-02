var _ = require('lodash'),
    messages = {},
    commandResults = {},
    visual = {};

exports.makeConsole = function(id, sandboxedFunctionWrapper) {
    messages[id] = [];
    commandResults[id] = [];
    visual[id] = [];
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
        },
        addVisual: {
            value: sandboxedFunctionWrapper(function(roomName, data) {
                if(!visual[id][roomName]) {
                    if(Object.keys(visual[id]).length >= 20) {
                        throw new Error('You cannot use RoomVisual in more than 20 rooms in the same tick.');
                    }
                    visual[id][roomName] = "";
                }
                if(visual[id][roomName].length > 500*1024) {
                    throw new Error(`RoomVisual size in room ${roomName} has exceeded 500 KB limit`);
                }
                visual[id][roomName] += JSON.stringify(data)+"\n";
            })
        },
        getVisualSize: {
            value: sandboxedFunctionWrapper(function(roomName) {
                if(!visual[id][roomName]) {
                    return 0;
                }
                return visual[id][roomName].length;
            })
        },
        clearVisual: {
            value: sandboxedFunctionWrapper(function(roomName) {
                visual[id][roomName] = "";
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

exports.getVisual = function(id) {
    var result = visual[id];
    visual[id] = [];
    return result;
};