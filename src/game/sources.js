var utils = require('./../utils'),
    rooms = require('./rooms'),
    driver = utils.getDriver(),
    C = driver.constants;

var runtimeData, intents, register, globals;

exports.make = function(_runtimeData, _intents, _register, _globals) {

    runtimeData = _runtimeData;
    intents = _intents;
    register = _register;
    globals = _globals;

    if(globals.Source) {
        return;
    }

    var data = (id) => {
        if(!runtimeData.roomObjects[id]) {
            throw new Error("Could not find an object with ID "+id);
        }
        return runtimeData.roomObjects[id];
    };

    var Source = register.wrapFn(function(id) {
        var _data = data(id);
        globals.RoomObject.call(this, _data.x, _data.y, _data.room);
        this.id = id;
    });

    Source.prototype = Object.create(globals.RoomObject.prototype);
    Source.prototype.constructor = Source;

    utils.defineGameObjectProperties(Source.prototype, data, {
        energy: (o) => o.energy,
        energyCapacity: (o) => o.energyCapacity,
        ticksToRegeneration: (o) => o.nextRegenerationTime ? o.nextRegenerationTime - runtimeData.time : undefined
    });

    Source.prototype.toString = register.wrapFn(function() {
        return `[source #${this.id}]`;
    });

    globals.Source = Source;
};