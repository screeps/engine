var utils = require('./../utils'),
    rooms = require('./rooms'),
    driver = require('~runtime-driver'),
    C = driver.constants,
    _ = require('lodash');

var runtimeData, intents, register, globals;

exports.make = function(_runtimeData, _intents, _register, _globals) {

    runtimeData = _runtimeData;
    intents = _intents;
    register = _register;
    globals = _globals;

    if(globals.ConstructionSite) {
        return;
    }

    var data = (id) => {
        if(!runtimeData.roomObjects[id]) {
            throw new Error("Could not find an object with ID "+id);
        }
        return runtimeData.roomObjects[id];
    };

    var ConstructionSite = register.wrapFn(function(id) {
        var _data = data(id);
        globals.RoomObject.call(this, _data.x, _data.y, _data.room);
        this.id = id;
    });

    ConstructionSite.prototype = Object.create(globals.RoomObject.prototype);
    ConstructionSite.prototype.constructor = ConstructionSite;

    utils.defineGameObjectProperties(ConstructionSite.prototype, data, {
        progress: (o) => o.progress,
        progressTotal: (o) => o.progressTotal,
        structureType: (o) => o.structureType,
        name: (o) => o.name,
        owner: (o) => new Object({username: runtimeData.users[o.user].username}),
        my: (o) => _.isUndefined(o.user) ? undefined : o.user == runtimeData.user._id
    });


    ConstructionSite.prototype.toString = register.wrapFn(function() {
        return `[construction site (${data(this.id).structureType}) #${this.id}]`;
    });

    ConstructionSite.prototype.remove = register.wrapFn(function() {

        if(!this.my && !(this.room && this.room.controller && this.room.controller.my)) {
            return C.ERR_NOT_OWNER;
        }
        intents.pushByName('room', 'removeConstructionSite', {roomName: data(this.id).room, id: this.id});
        return C.OK;
    });

    globals.ConstructionSite = ConstructionSite;
};