var utils = require('./../utils'),
    driver = utils.getRuntimeDriver(),
    C = driver.constants,
    _ = require('lodash');

var runtimeData, intents, register, globals;

function _storeGetter(o) {
    if(!o) {
        o = {store: {}, storeCapacity: this.carryCapacity};
    }
    return new globals.Store(o);
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
        globals.RoomObject.call(this, _data.x, _data.y, _data.room, _data.effects);
        this.id = id;
    });

    Tombstone.prototype = Object.create(globals.RoomObject.prototype);
    Tombstone.prototype.constructor = Tombstone;
    utils.defineGameObjectProperties(Tombstone.prototype, data, {
        deathTime: (o) => o.deathTime,
        store: _storeGetter,
        ticksToDecay: (o) => o.decayTime - runtimeData.time,
        creep: (o) => {
            if(o.creepId) {
                let creep = new globals.Creep();
                globals.RoomObject.call(creep, o.x, o.y, o.room);
                Object.defineProperties(creep, {
                    id: {
                        enumerable: true,
                        get() {
                            return o.creepId;
                        }
                    },
                    name: {
                        enumerable: true,
                        get() {
                            return o.creepName;
                        }
                    },
                    spawning: {
                        enumerable: true,
                        get() {
                            return false;
                        }
                    },
                    my: {
                        enumerable: true,
                        get() {
                            return o.user == runtimeData.user._id;
                        }
                    },
                    body: {
                        enumerable: true,
                        get() {
                            return _.map(o.creepBody, type => ({type, hits: 0}))
                        }
                    },
                    owner: {
                        enumerable: true,
                        get() {
                            return _.isUndefined(o.user) || o.user === null ? undefined : {
                                username: runtimeData.users[o.user].username
                            }
                        }
                    },
                    ticksToLive: {
                        enumerable: true,
                        get() {
                            return o.creepTicksToLive;
                        }
                    },
                    carryCapacity: {
                        enumerable: true,
                        get() {
                            return _.reduce(o.creepBody,
                                (result, type) => result += type === C.CARRY ? C.CARRY_CAPACITY : 0, 0);
                        }
                    },
                    carry: {
                        enumerable: true,
                        get: _storeGetter
                    },
                    store: {
                        enumerable: true,
                        get: _storeGetter
                    },
                    fatigue: {
                        enumerable: true,
                        get() {
                            return 0;
                        }
                    },
                    hits: {
                        enumerable: true,
                        get() {
                            return 0;
                        }
                    },
                    hitsMax: {
                        enumerable: true,
                        get() {
                            return o.creepBody.length * 100;
                        }
                    },
                    saying: {
                        enumerable: true,
                        get() {
                            return o.creepSaying;
                        }
                    }
                });
                return creep;
            }

            if(o.powerCreepId) {

                let powerCreep = new globals.PowerCreep();
                globals.RoomObject.call(powerCreep, o.x, o.y, o.room);
                Object.defineProperties(powerCreep, {
                    id: {
                        enumerable: true,
                        get() {
                            return o.powerCreepId;
                        }
                    },
                    name: {
                        enumerable: true,
                        get() {
                            return o.powerCreepName;
                        }
                    },
                    className: {
                        enumerable: true,
                        get() {
                            return o.powerCreepClassName;
                        }
                    },
                    level: {
                        enumerable: true,
                        get() {
                            return o.powerCreepLevel;
                        }
                    },
                    my: {
                        enumerable: true,
                        get() {
                            return o.user == runtimeData.user._id;
                        }
                    },
                    body: {
                        enumerable: true,
                        get() {
                            return _.map(o.creepBody, type => ({type, hits: 0}))
                        }
                    },
                    owner: {
                        enumerable: true,
                        get() {
                            return _.isUndefined(o.user) || o.user === null ? undefined : {
                                username: runtimeData.users[o.user].username
                            }
                        }
                    },
                    ticksToLive: {
                        enumerable: true,
                        get() {
                            return o.powerCreepTicksToLive;
                        }
                    },
                    carryCapacity: {
                        enumerable: true,
                        get() {
                            return o.powerCreepLevel * 100;
                        }
                    },
                    carry: {
                        enumerable: true,
                        get: _storeGetter
                    },
                    store: {
                        enumerable: true,
                        get: _storeGetter
                    },
                    hits: {
                        enumerable: true,
                        get() {
                            return 0;
                        }
                    },
                    hitsMax: {
                        enumerable: true,
                        get() {
                            return o.powerCreepLevel * 1000;
                        }
                    },
                    saying: {
                        enumerable: true,
                        get() {
                            return o.powerCreepSaying;
                        }
                    },
                    powers: {
                        enumerable: true,
                        get() {
                            return o.powerCreepPowers;
                        }
                    }
                });
                return powerCreep;
            }
        },
    });

    Tombstone.prototype.toString = register.wrapFn(function() {
        return `[Tombstone #${this.id}]`;
    });

    Object.defineProperty(globals, 'Tombstone', {enumerable: true, value: Tombstone});
};
