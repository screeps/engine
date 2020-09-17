var _ = require('lodash'),
    messages = {},
    commandResults = {},
    visual = {};

exports.makeConsole = function(id, sandboxedFunctionWrapper) {
    messages[id] = [];
    commandResults[id] = [];
    visual[id] = {};
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
                roomName = roomName || "";
                if(!data) {
                    return;
                }
                const sizeLimit = roomName == "map" ? 1000 : 500;
                visual[id][roomName] = visual[id][roomName] || "";
                const dataString = _.isString(data) ? data : JSON.stringify(data)+"\n";
                if((visual[id][roomName].length + dataString.length) > sizeLimit*1024) {
                    if(roomName == "map") {
                        throw new Error( `MapVisual size has exceeded ${sizeLimit} KB limit`);
                    }
                    throw new Error( `RoomVisual size in room ${roomName} has exceeded ${sizeLimit} KB limit`);
                }

                visual[id][roomName] += dataString;
            })
        },
        getVisualSize: {
            value: sandboxedFunctionWrapper(function(roomName) {
                roomName = roomName || "";
                if(!visual[id][roomName]) {
                    return 0;
                }
                return visual[id][roomName].length;
            })
        },
        clearVisual: {
            value: sandboxedFunctionWrapper(function(roomName) {
                roomName = roomName || "";
                visual[id][roomName] = "";
            })
        },
        getVisual: {
            value: sandboxedFunctionWrapper(function(roomName){
                return visual[id][roomName || ""];
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
