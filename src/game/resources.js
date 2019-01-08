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

    if(globals.Resource) {
        return;
    }

    var data = (id) => {
        if(!runtimeData.roomObjects[id]) {
            throw new Error("Could not find an object with ID "+id);
        }
        return runtimeData.roomObjects[id];
    };

    var Resource = register.wrapFn(function(id) {
        var _data = data(id);
        globals.RoomObject.call(this, _data.x, _data.y, _data.room, _data.effects);
        this.id = id;
    });

    Resource.prototype = Object.create(globals.RoomObject.prototype);
    Resource.prototype.constructor = Resource;

    utils.defineGameObjectProperties(Resource.prototype, data, {
        energy: (o) => o.energy,
        amount: (o) => o[o.resourceType || C.RESOURCE_ENERGY],
        resourceType: (o) => o.resourceType || C.RESOURCE_ENERGY
    });

    Resource.prototype.toString = register.wrapFn(function() {
        return `[resource (${this.resourceType}) #${this.id}]`;
    });

    Object.defineProperty(globals, 'Resource', {enumerable: true, value: Resource});
    Object.defineProperty(globals, 'Energy', {enumerable: true, value: Resource});
};