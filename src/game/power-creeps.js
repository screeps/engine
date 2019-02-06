var utils = require('./../utils'),
    rooms = require('./rooms'),
    driver = utils.getRuntimeDriver(),
    _ = require('lodash'),
    C = driver.constants;

var runtimeData, intents, register, globals;

function calcFreePowerLevels() {
    var level = Math.floor(Math.pow((runtimeData.user.power || 0) / C.POWER_LEVEL_MULTIPLY, 1 / C.POWER_LEVEL_POW));
    var used = Object.keys(runtimeData.userPowerCreeps).length + _.sum(runtimeData.userPowerCreeps, 'level');
    return level - used;
}

function roomData(id) {
    if(!runtimeData.roomObjects[id]) {
        return {};
    }
    return runtimeData.roomObjects[id];
}
function userData(id) {
    if(!runtimeData.userPowerCreeps[id]) {
        throw new Error("Could not find an object with ID "+id);
    }
    return runtimeData.userPowerCreeps[id];
}

exports.make = function(_runtimeData, _intents, _register, _globals) {

    runtimeData = _runtimeData;
    intents = _intents;
    register = _register;
    globals = _globals;

    if(globals.PowerCreep) {
        return;
    }

    var PowerCreep = register.wrapFn(function(id) {
        var _roomData = roomData(id);
        var _userData = userData(id);
        if(_roomData.room) {
            globals.RoomObject.call(this, _roomData.x, _roomData.y, _roomData.room);
        }
        this.powers = _userData.powers;
        if(_roomData.powers) {
            for(var i in _roomData.powers) {
                this.powers[i].cooldown = Math.max(0, (_roomData.powers[i].cooldownTime || 0) - runtimeData.time)
            }
        }
        this.id = id;
    });

    PowerCreep.prototype = Object.create(globals.RoomObject.prototype);
    PowerCreep.prototype.constructor = PowerCreep;

    utils.defineGameObjectProperties(PowerCreep.prototype, userData, {
        name: (o) => o.name,
        my: (o) => o.user == runtimeData.user._id,
        owner: (o) => new Object({username: runtimeData.users[o.user].username}),
        shard: (o) => o.shard,
        className: (o) => o.className,
        level: (o) => o.level,
        hitsMax: (o) => o.hitsMax,
        spawnCooldownTime: (o) => o.spawnCooldownTime !== null && o.spawnCooldownTime > Date.now() ? o.spawnCooldownTime : undefined,
        carryCapacity: (o) => o.energyCapacity,
    });

    utils.defineGameObjectProperties(PowerCreep.prototype, roomData, {
        hits: (o) => o.hits,
        saying: o => {
            if(!o.actionLog || !o.actionLog.say) {
                return undefined;
            }
            if(o.user == runtimeData.user._id) {
                return o.actionLog.say.message;
            }
            return o.actionLog.say.isPublic ? o.actionLog.say.message : undefined;
        },
        carry: (o) => {

            var result = {energy: 0};

            C.RESOURCES_ALL.forEach(resourceType => {
                if(o[resourceType]) {
                    result[resourceType] = o[resourceType];
                }
            });

            return result;
        },
        ticksToLive: (o) => o.ageTime - runtimeData.time,
    });

    Object.defineProperty(PowerCreep.prototype, 'memory', {
        get: function() {
            if(this.id && !this.my) {
                return undefined;
            }
            if(_.isUndefined(globals.Memory.powerCreeps) || globals.Memory.powerCreeps === 'undefined') {
                globals.Memory.powerCreeps = {};
            }
            if(!_.isObject(globals.Memory.powerCreeps)) {
                return undefined;
            }
            return globals.Memory.powerCreeps[this.name] = globals.Memory.powerCreeps[this.name] || {};
        },
        set: function(value) {
            if(this.id && !this.my) {
                throw new Error('Could not set other player\'s creep memory');
            }
            if(_.isUndefined(globals.Memory.powerCreeps) || globals.Memory.powerCreeps === 'undefined') {
                globals.Memory.powerCreeps = {};
            }
            if(!_.isObject(globals.Memory.powerCreeps)) {
                throw new Error('Could not set creep memory');
            }
            globals.Memory.powerCreeps[this.name] = value;
        }
    });

    PowerCreep.prototype.toString = register.wrapFn(function() {
        return `[powerCreep ${this.name}]`;
    });

    PowerCreep.prototype.move = register.wrapFn(function(target) {
        if(!this.room) {
            return C.ERR_BUSY;
        }
        return globals.Creep.prototype.move.call(this, target);
    });

    PowerCreep.prototype.moveTo = register.wrapFn(function(firstArg, secondArg, opts) {
        if(!this.room) {
            return C.ERR_BUSY;
        }
        return globals.Creep.prototype.moveTo.call(this, firstArg, secondArg, opts);
    });

    PowerCreep.prototype.moveByPath = register.wrapFn(function(path) {
        if(!this.room) {
            return C.ERR_BUSY;
        }
        return globals.Creep.prototype.moveByPath.call(this, path);
    });

    PowerCreep.prototype.transfer = register.wrapFn(function(target, resourceType, amount) {
        if(!this.room) {
            return C.ERR_BUSY;
        }
        return globals.Creep.prototype.transfer.call(this, target, resourceType, amount);
    });

    PowerCreep.prototype.withdraw = register.wrapFn(function(target, resourceType, amount) {
        if(!this.room) {
            return C.ERR_BUSY;
        }
        return globals.Creep.prototype.withdraw.call(this, target, resourceType, amount);
    });

    PowerCreep.prototype.drop = register.wrapFn(function(resourceType, amount) {
        if(!this.room) {
            return C.ERR_BUSY;
        }
        return globals.Creep.prototype.drop.call(this, resourceType, amount);
    });

    PowerCreep.prototype.pickup = register.wrapFn(function(target) {
        if(!this.room) {
            return C.ERR_BUSY;
        }
        return globals.Creep.prototype.pickup.call(this, target);
    });

    PowerCreep.prototype.say = register.wrapFn(function(message, isPublic) {
        if(!this.room) {
            return C.ERR_BUSY;
        }
        return globals.Creep.prototype.say.call(this, message, isPublic);
    });

    PowerCreep.prototype.spawn = register.wrapFn(function(powerSpawn) {
        if(this.room) {
            return C.ERR_BUSY;
        }
        if(!(powerSpawn instanceof globals.StructurePowerSpawn)) {
            return C.ERR_INVALID_TARGET;
        }
        if(!this.my || !powerSpawn.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!utils.checkStructureAgainstController(roomData(powerSpawn.id), register.objectsByRoom[roomData(powerSpawn.id).room], roomData(powerSpawn.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }

        if(this.spawnCooldownTime) {
            return C.ERR_BUSY;
        }

        intents.pushByName('global', 'spawnPowerCreep', {id: powerSpawn.id, name: this.name}, 50);
        return C.OK;
    });

    PowerCreep.prototype.suicide = register.wrapFn(function() {

        if(!this.room) {
            return C.ERR_BUSY;
        }
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }

        intents.pushByName('global', 'suicidePowerCreep', {id: this.id}, 50);
        return C.OK;
    });

    PowerCreep.prototype.delete = register.wrapFn(function() {

        if(this.room) {
            return C.ERR_BUSY;
        }
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }

        intents.pushByName('global', 'deletePowerCreep', {id: this.id}, 50);
        return C.OK;
    });

    PowerCreep.prototype.upgrade = register.wrapFn(function(power) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(calcFreePowerLevels() <= 0) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(this.level >= C.POWER_CREEP_MAX_LEVEL) {
            return C.ERR_FULL;
        }
        var powerInfo = C.POWER_INFO[power];
        if(!powerInfo || powerInfo.className !== this.className) {
            return C.ERR_INVALID_ARGS;
        }

        var powerData = userData(this.id).powers[power];
        var powerLevel = powerData ? powerData.level : 0;

        if(this.level < powerInfo.level[powerLevel]) {
            return C.ERR_FULL;
        }

        intents.pushByName('global', 'upgradePowerCreep', {id: this.id, power}, 50);
        return C.OK;
    });

    PowerCreep.prototype.usePower = register.wrapFn(function(power, target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!this.room) {
            return C.ERR_BUSY;
        }

        var powerData = roomData(this.id).powers[power];
        var powerInfo = C.POWER_INFO[power];
        if(!powerData || !powerData.level || !powerInfo) {
            return C.ERR_NO_BODYPART;
        }
        if(powerData.cooldownTime > runtimeData.time) {
            return C.ERR_TIRED;
        }
        if(powerInfo.ops && (roomData(this.id).ops || 0) < powerInfo.ops) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(powerInfo.range) {
            if(!target) {
                return C.ERR_INVALID_TARGET;
            }
            if(!this.pos.inRangeTo(target, powerInfo.range)) {
                return C.ERR_NOT_IN_RANGE;
            }
            var currentEffect = _.find(target.effects, i => i.power == power);
            if(currentEffect && currentEffect.level >= powerData.level && currentEffect.ticksRemaining > 0) {
                return C.ERR_FULL;
            }
        }
        if(!this.room.controller.isPowerEnabled) {
            return C.ERR_INVALID_ARGS;
        }

        intents.set(this.id, 'usePower', {power, id: target ? target.id : undefined});
        return C.OK;
    });

    PowerCreep.prototype.enableRoom = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!this.room) {
            return C.ERR_BUSY;
        }

        if(!target || !target.id || !register.structures[target.id] || !(target instanceof globals.Structure)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }
        if(target.structureType != 'controller') {
            return C.ERR_INVALID_TARGET;
        }

        intents.set(this.id, 'enableRoom', {id: target.id});
        return C.OK;
    });

    PowerCreep.prototype.renew = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!this.room) {
            return C.ERR_BUSY;
        }

        if(!target || !target.id || !register.structures[target.id] || !(target instanceof globals.StructurePowerBank)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }
        intents.set(this.id, 'renew', {id: target.id});
        return C.OK;
    });

    PowerCreep.create = register.wrapFn(function(name, className) {

        if(calcFreePowerLevels() <= 0) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(_.any(runtimeData.userPowerCreeps, {name})) {
            return C.ERR_NAME_EXISTS;
        }
        if(Object.values(C.POWER_CLASS).indexOf(className) === -1) {
            return C.ERR_INVALID_ARGS;
        }
        intents.pushByName('global', 'createPowerCreep', {name, className}, 50);
        return C.OK;
    });



    Object.defineProperty(globals, 'PowerCreep', {enumerable: true, value: PowerCreep});
};

