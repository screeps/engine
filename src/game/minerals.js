var utils = require('./../utils'),
    rooms = require('./rooms'),
    driver = utils.getRuntimeDriver(),
    C = driver.constants;

var runtimeData, intents, register, globals;

exports.make = function(_runtimeData, _intents, _register, _globals) {

    runtimeData = _runtimeData;
    intents = _intents;
    register = _register;
    globals = _globals;

    if(globals.Mineral) {
        return;
    }

    var data = (id) => {
        if(!runtimeData.roomObjects[id]) {
            throw new Error("Could not find an object with ID "+id);
        }
        return runtimeData.roomObjects[id];
    };

    var Mineral = register.wrapFn(function(id) {
        var _data = data(id);
        globals.RoomObject.call(this, _data.x, _data.y, _data.room);
        this.id = id;
    });

    Mineral.prototype = Object.create(globals.RoomObject.prototype);
    Mineral.prototype.constructor = Mineral;

    utils.defineGameObjectProperties(Mineral.prototype, data, {
        mineralType: (o) => o.mineralType,
        mineralAmount: (o) => o.mineralAmount,
        density: o => o.density,
        ticksToRegeneration: (o) => o.nextRegenerationTime ? o.nextRegenerationTime - runtimeData.time : undefined
    });

    Mineral.prototype.toString = register.wrapFn(function() {
        return `[mineral (${this.mineralType}) #${this.id}]`;
    });

    Object.defineProperty(globals, 'Mineral', {enumerable: true, value: Mineral});
};