var utils = require('./../utils'),
    rooms = require('./rooms'),
    driver = utils.getDriver(),
    C = driver.constants,
    _ = require('lodash');

var runtimeData, intents, register, globals;

function _storeGetter(o) {
    var result = {energy: o.energy};

    C.RESOURCES_ALL.forEach(resourceType => {
        if (o[resourceType]) {
            result[resourceType] = o[resourceType];
        }
    });

    return result;
}

exports.make = function(_runtimeData, _intents, _register, _globals) {

    runtimeData = _runtimeData;
    intents = _intents;
    register = _register;
    globals = _globals;

    if(globals.Tombstone) {
        return;
    }

    var data = (id) => {
        if(!runtimeData.roomObjects[id]) {
            throw new Error("Could not find an object with ID "+id);
        }
        return runtimeData.roomObjects[id];
    };

    var Tombstone = register.wrapFn(function(id) {
        var _data = data(id);
        globals.RoomObject.call(this, _data.x, _data.y, _data.room);
        this.id = id;
    });

    Tombstone.prototype = Object.create(globals.RoomObject.prototype);
    Tombstone.prototype.constructor = Tombstone;
    utils.defineGameObjectProperties(Tombstone.prototype, data, {
        owner: (o) => _.isUndefined(o.user) || o.user === null ? undefined : {
                username: runtimeData.users[o.user].username
            },
        my: (o) => _.isUndefined(o.user) ? undefined : o.user == runtimeData.user._id,
        creepId: (o) => o.creepId,
        deathTime: (o) => o.deathTime,
        store: _storeGetter,
        ticksToDecay: (o) => o.decayTime - runtimeData.time
    });

    Tombstone.prototype.toString = register.wrapFn(function() {
        return `[Tombstone #${this.id}]`;
    });

    globals.Tombstone = Tombstone;
};