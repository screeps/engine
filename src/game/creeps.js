var utils = require('./../utils'),
    rooms = require('./rooms'),
    driver = require('~runtime-driver'),
    _ = require('lodash'),
    C = driver.constants;

var runtimeData, intents, register, globals, controllersClaimedInTick;

function _getActiveBodyparts(body, type) {
    var count = 0;
    for(var i = body.length-1; i>=0; i--) {
        if (body[i].hits <= 0)
            break;
        if (body[i].type === type)
            count++;
    }
    return count;
}

function _hasActiveBodypart(body, type) {
    for(var i = body.length-1; i>=0; i--) {
        if (body[i].hits <= 0)
            break;
        if (body[i].type === type)
            return true;
    }
    return false;
}

exports.make = function(_runtimeData, _intents, _register, _globals) {

    runtimeData = _runtimeData;
    intents = _intents;
    register = _register;
    globals = _globals;

    controllersClaimedInTick = 0;

    if(globals.Creep) {
        return;
    }

    var data = (id) => {
        if(!id) {
            throw new Error("This creep doesn't exist yet");
        }
        if(!runtimeData.roomObjects[id]) {
            throw new Error("Could not find an object with ID "+id);
        }
        return runtimeData.roomObjects[id];
    };

    var Creep = register.wrapFn(function(id) {
        if(id) {
            var _data = data(id);
            globals.RoomObject.call(this, _data.x, _data.y, _data.room);
            this.id = id;
        }
    });

    Creep.prototype = Object.create(globals.RoomObject.prototype);
    Creep.prototype.constructor = Creep;

    utils.defineGameObjectProperties(Creep.prototype, data, {
        name: (o) => o.name,
        body: (o) => o.body,
        my: (o) => o.user == runtimeData.user._id,
        owner: (o) => new Object({username: runtimeData.users[o.user].username}),
        spawning: (o) => o.spawning,
        ticksToLive: (o) => o.ageTime ? o.ageTime - runtimeData.time : undefined,
        carryCapacity: (o) => o.energyCapacity,
        carry: (o) => {

            var result = {energy: o.energy};

            C.RESOURCES_ALL.forEach(resourceType => {
                if(o[resourceType]) {
                    result[resourceType] = o[resourceType];
                }
            });

            return result;
        },
        fatigue: (o) => o.fatigue,
        hits: (o) => o.hits,
        hitsMax: (o) => o.hitsMax,
        saying: o => {
            if(!o.actionLog || !o.actionLog.say) {
                return undefined;
            }
            if(o.user == runtimeData.user._id) {
                return o.actionLog.say.message;
            }
            return o.actionLog.say.isPublic ? o.actionLog.say.message : undefined;
        }
    });

    Object.defineProperty(Creep.prototype, 'memory', {
        get: function() {
            if(this.id && !this.my) {
                return undefined;
            }
            if(_.isUndefined(globals.Memory.creeps) || globals.Memory.creeps === 'undefined') {
                globals.Memory.creeps = {};
            }
            if(!_.isObject(globals.Memory.creeps)) {
                return undefined;
            }
            return globals.Memory.creeps[this.name] = globals.Memory.creeps[this.name] || {};
        },
        set: function(value) {
            if(this.id && !this.my) {
                throw new Error('Could not set other player\'s creep memory');
            }
            if(_.isUndefined(globals.Memory.creeps) || globals.Memory.creeps === 'undefined') {
                globals.Memory.creeps = {};
            }
            if(!_.isObject(globals.Memory.creeps)) {
                throw new Error('Could not set creep memory');
            }
            globals.Memory.creeps[this.name] = value;
        }
    });

    Creep.prototype.toString = register.wrapFn(function() {
        return `[creep ${!this.id || data(this.id).user == runtimeData.user._id ? this.name : '#'+this.id}]`;
    });

    Creep.prototype.move = register.wrapFn(function(direction) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(data(this.id).fatigue > 0) {
            return C.ERR_TIRED;
        }
        if(!_hasActiveBodypart(this.body, C.MOVE)) {
            return C.ERR_NO_BODYPART;
        }
        direction = +direction;
        if(!direction || direction < 1 || direction > 8) {
            return C.ERR_INVALID_ARGS;
        }
        intents.set(this.id, 'move', {direction});
        return C.OK;
    });

    Creep.prototype.moveTo = register.wrapFn(function(firstArg, secondArg, opts) {

        var visualized = false;

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(_.isObject(firstArg)) {
            opts = _.clone(secondArg);
        }
        opts = opts || {};

        if(data(this.id).fatigue > 0 && (!opts || !opts.visualizePathStyle)) {
            return C.ERR_TIRED;
        }
        if(!_hasActiveBodypart(this.body, C.MOVE)) {
            return C.ERR_NO_BODYPART;
        }

        var [x,y,roomName] = utils.fetchXYArguments(firstArg, secondArg, globals);
        roomName = roomName || this.pos.roomName;
        if(_.isUndefined(x) || _.isUndefined(y)) {
            register.assertTargetObject(firstArg);
            return C.ERR_INVALID_TARGET;
        }

        var targetPos = new globals.RoomPosition(x,y,roomName);

        if(_.isUndefined(opts.reusePath)) {
            opts.reusePath = 5;
        }
        if(_.isUndefined(opts.serializeMemory)) {
            opts.serializeMemory = true;
        }

        if(opts.visualizePathStyle) {
            _.defaults(opts.visualizePathStyle, {fill: 'transparent', stroke: '#fff', lineStyle: 'dashed', strokeWidth: .15, opacity: .1});
        }

        if(x == this.pos.x && y == this.pos.y && roomName == this.pos.roomName) {
            return C.OK;
        }

        /*if(opts.reusePath && this.room.memory && _.isObject(this.room.memory) && this.room.memory._move) {

            var key = `${this.pos.x},${this.pos.y}:${roomName},${x},${y}`;

            if(key in this.room.memory._move) {
                if(this.room.memory._move[key].t + opts.reusePath < runtimeData.time ) {
                    delete this.room.memory._move[key];
                }
                else {
                    this.move(this.room.memory._move[key].d);
                    return C.OK;
                }
            }
        }


        if(opts.noPathFinding) {
            return C.ERR_NOT_FOUND;
        }

        var path = this.pos.findPathTo(new globals.RoomPosition(x,y,roomName), opts);

        if(opts.reusePath && this.room.memory && _.isObject(this.room.memory)) {

            this.room.memory._move = this.room.memory._move || {};

            path.forEach((i) => {
                var ix = i.x - i.dx;
                var iy = i.y - i.dy;
                var key = `${ix},${iy}:${roomName},${x},${y}`;
                this.room.memory._move[key] = {
                    t: runtimeData.time,
                    d: i.direction
                };
            });
        }*/

        if(opts.reusePath && this.memory && _.isObject(this.memory) && this.memory._move) {

            var _move = this.memory._move;

            if(runtimeData.time > _move.time + parseInt(opts.reusePath) || _move.room != this.pos.roomName) {
                delete this.memory._move;
            }
            else if(_move.dest.room == roomName && _move.dest.x == x && _move.dest.y == y) {

                var path = _.isString(_move.path) ? utils.deserializePath(_move.path) : _move.path;

                var idx = _.findIndex(path, {x: this.pos.x, y: this.pos.y});
                if(idx != -1) {
                    var oldMove = _.cloneDeep(_move);
                    path.splice(0,idx+1);
                    try {
                        _move.path = opts.serializeMemory ? utils.serializePath(path) : path;
                    }
                    catch(e) {
                        console.log('$ERR',this.pos,x,y,roomName,JSON.stringify(path),'-----',JSON.stringify(oldMove));
                        throw e;
                    }
                }
                if(path.length == 0) {
                    return this.pos.isNearTo(targetPos) ? C.OK : C.ERR_NO_PATH;
                }
                if(opts.visualizePathStyle) {
                    this.room.visual.poly(path, opts.visualizePathStyle);
                    visualized = true;
                }
                var result = this.moveByPath(path);

                if(result == C.OK) {
                    return C.OK;
                }
            }
        }

        if(opts.noPathFinding) {
            return C.ERR_NOT_FOUND;
        }

        var path = this.pos.findPathTo(targetPos, opts);

        if(opts.reusePath && this.memory && _.isObject(this.memory)) {
            this.memory._move = {
                dest: {x,y,room:roomName},
                time: runtimeData.time,
                path: opts.serializeMemory ? utils.serializePath(path) : _.clone(path),
                room: this.pos.roomName
            };
        }

        if(path.length == 0) {
            return C.ERR_NO_PATH;
        }

        if(opts.visualizePathStyle && !visualized) {
            this.room.visual.poly(path, opts.visualizePathStyle);
        }

        return this.move(path[0].direction);
    });

    Creep.prototype.moveByPath = register.wrapFn(function(path) {
        if(_.isArray(path) && path.length > 0 && (path[0] instanceof globals.RoomPosition)) {
            var idx = _.findIndex(path, (i) => i.isEqualTo(this.pos));
            if(idx === -1) {
                if(!path[0].isNearTo(this.pos)) {
                    return C.ERR_NOT_FOUND;
                }
            }
            idx++;
            if(idx >= path.length) {
                return C.ERR_NOT_FOUND;
            }

            return this.move(this.pos.getDirectionTo(path[idx]));
        }

        if(_.isString(path)) {
            path = utils.deserializePath(path);
        }
        if(!_.isArray(path)) {
            return C.ERR_INVALID_ARGS;
        }
        var cur = _.find(path, (i) => i.x - i.dx == this.pos.x && i.y - i.dy == this.pos.y);
        if(!cur) {
            return C.ERR_NOT_FOUND;
        }

        return this.move(cur.direction);
    });

    Creep.prototype.harvest = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!_hasActiveBodypart(this.body, C.WORK)) {
            return C.ERR_NO_BODYPART;
        }
        if(!target || !target.id) {
            return C.ERR_INVALID_TARGET;
        }

        if(register.sources[target.id] && (target instanceof globals.Source)) {

            if(!target.energy) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }
            if(!target.pos.isNearTo(this.pos)) {
                return C.ERR_NOT_IN_RANGE;
            }
            if(this.room.controller && (
            this.room.controller.owner && this.room.controller.owner.username != runtimeData.user.username ||
            this.room.controller.reservation && this.room.controller.reservation.username != runtimeData.user.username)) {
                return C.ERR_NOT_OWNER;
            }

        }
        else if(register.minerals[target.id] && (target instanceof globals.Mineral)) {

            if(!target.mineralAmount) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }
            if(!target.pos.isNearTo(this.pos)) {
                return C.ERR_NOT_IN_RANGE;
            }
            var extractor = _.find(target.pos.lookFor('structure'), {structureType: C.STRUCTURE_EXTRACTOR});
            if(!extractor) {
                return C.ERR_NOT_FOUND;
            }
            if(extractor.owner && !extractor.my) {
                return C.ERR_NOT_OWNER;
            }
            if(!extractor.isActive()) {
                return C.ERR_RCL_NOT_ENOUGH;
            }
            if(extractor.cooldown) {
                return C.ERR_TIRED;
            }
        }
        else {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }

        intents.set(this.id, 'harvest', {id: target.id});
        return C.OK;
    });

    Creep.prototype.drop = register.wrapFn(function(resourceType, amount) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!_.contains(C.RESOURCES_ALL, resourceType)) {
            return C.ERR_INVALID_ARGS;
        }
        if(!data(this.id)[resourceType]) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(!amount) {
            amount = data(this.id)[resourceType];
        }
        if(data(this.id)[resourceType] < amount) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }

        intents.set(this.id, 'drop', {amount, resourceType});
        return C.OK;
    });

    Creep.prototype.transfer = register.wrapFn(function(target, resourceType, amount) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(amount < 0) {
            return C.ERR_INVALID_ARGS;
        }
        if(!_.contains(C.RESOURCES_ALL, resourceType)) {
            return C.ERR_INVALID_ARGS;
        }
        if(!target || !target.id || (!register.spawns[target.id] && !register.creeps[target.id] && !register.structures[target.id]) ||
            !(target instanceof globals.StructureSpawn) && !(target instanceof globals.Structure) && !(target instanceof globals.Creep)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(resourceType == C.RESOURCE_ENERGY) {

            if(register.structures[target.id] && register.structures[target.id].structureType == 'controller') {
                return this.upgradeController(target);
            }

            if (register.structures[target.id] &&
                register.structures[target.id].structureType != 'extension' &&
                register.structures[target.id].structureType != 'spawn' &&
                register.structures[target.id].structureType != 'link' &&
                register.structures[target.id].structureType != 'storage' &&
                register.structures[target.id].structureType != 'tower' &&
                register.structures[target.id].structureType != 'powerSpawn' &&
                register.structures[target.id].structureType != 'terminal' &&
                register.structures[target.id].structureType != 'container' &&
                register.structures[target.id].structureType != 'lab' &&
                register.structures[target.id].structureType != 'nuker') {
                return C.ERR_INVALID_TARGET;
            }
        }
        else if(resourceType == C.RESOURCE_POWER) {
            if (register.structures[target.id] &&
                register.structures[target.id].structureType != 'storage' &&
                register.structures[target.id].structureType != 'terminal' &&
                register.structures[target.id].structureType != 'container' &&
                register.structures[target.id].structureType != 'powerSpawn') {
                return C.ERR_INVALID_TARGET;
            }
        }
        else {
            if (register.structures[target.id] &&
                register.structures[target.id].structureType != 'storage' &&
                register.structures[target.id].structureType != 'terminal' &&
                register.structures[target.id].structureType != 'container' &&
                register.structures[target.id].structureType != 'lab' &&
                register.structures[target.id].structureType != 'nuker') {
                return C.ERR_INVALID_TARGET;
            }
        }

        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }
        if(!data(this.id)[resourceType]) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(target.structureType == 'powerSpawn') {
            if(data(target.id)[resourceType] >= data(target.id)[resourceType+'Capacity']) {
                return C.ERR_FULL;
            }
            if(!amount) {
                amount = Math.min( data(this.id)[resourceType], data(target.id)[resourceType+'Capacity'] - data(target.id)[resourceType] );
            }
            if(data(this.id)[resourceType] < amount) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }
            if(!amount || data(target.id)[resourceType] + amount > data(target.id)[resourceType+'Capacity']) {
                return C.ERR_FULL;
            }
        }
        else if(target.structureType == 'lab') {
            if(resourceType != C.RESOURCE_ENERGY && data(target.id).mineralType && data(target.id).mineralType != resourceType) {
                return C.ERR_FULL;
            }

            var targetCapacity = resourceType == C.RESOURCE_ENERGY ? data(target.id).energyCapacity : data(target.id).mineralCapacity;
            var targetAmount = resourceType == C.RESOURCE_ENERGY ? data(target.id).energy : data(target.id).mineralAmount;

            if(targetAmount > targetCapacity) {
                return C.ERR_FULL;
            }
            if(!amount) {
                amount = Math.min( data(this.id)[resourceType], targetCapacity - targetAmount );
            }
            if(data(this.id)[resourceType] < amount) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }
            if(!amount || targetAmount + amount > targetCapacity) {
                return C.ERR_FULL;
            }
        }
        else if(target.structureType == 'nuker') {
            if(resourceType != C.RESOURCE_ENERGY && resourceType != C.RESOURCE_GHODIUM) {
                return C.ERR_FULL;
            }
            if(data(target.id)[resourceType] >= data(target.id)[resourceType+'Capacity']) {
                return C.ERR_FULL;
            }
            if(!amount) {
                amount = Math.min( data(this.id)[resourceType], data(target.id)[resourceType+'Capacity'] - data(target.id)[resourceType] );
            }
            if(data(this.id)[resourceType] < amount) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }
            if(!amount || data(target.id)[resourceType] + amount > data(target.id)[resourceType+'Capacity']) {
                return C.ERR_FULL;
            }
        }
        else {
            if(!_.isUndefined(data(target.id).energyCapacity) && utils.calcResources(data(target.id)) > data(target.id).energyCapacity) {
                return C.ERR_FULL;
            }
            if(!amount) {
                if(!_.isUndefined(data(target.id).energyCapacity)) {
                    amount = Math.min(data(this.id)[resourceType], data(target.id).energyCapacity - utils.calcResources(data(target.id)));
                }
                else {
                    amount = data(this.id)[resourceType];
                }
            }
            if(data(this.id)[resourceType] < amount) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }
            if(!_.isUndefined(data(target.id).energyCapacity) && (!amount || utils.calcResources(data(target.id)) + amount > data(target.id).energyCapacity)) {
                return C.ERR_FULL;
            }
        }

        intents.set(this.id, 'transfer', {id: target.id, amount, resourceType});
        return C.OK;
    });

    Creep.prototype.withdraw = register.wrapFn(function(target, resourceType, amount) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(amount < 0) {
            return C.ERR_INVALID_ARGS;
        }
        if(!_.contains(C.RESOURCES_ALL, resourceType)) {
            return C.ERR_INVALID_ARGS;
        }
        if(!target || !target.id || ((!register.structures[target.id] || !(target instanceof globals.Structure) ) && !(target instanceof globals.Tombstone))) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }

        if(target.my === false && _.any(target.pos.lookFor('structure'), i => i.structureType == C.STRUCTURE_RAMPART && !i.my && !i.isPublic)) {
            return C.ERR_NOT_OWNER;
        }
        if(this.room.controller && !this.room.controller.my && this.room.controller.safeMode) {
            return C.ERR_NOT_OWNER;
        }
        
        if(resourceType == C.RESOURCE_ENERGY) {

            if (register.structures[target.id] &&
            register.structures[target.id].structureType != 'extension' &&
            register.structures[target.id].structureType != 'spawn' &&
            register.structures[target.id].structureType != 'link' &&
            register.structures[target.id].structureType != 'storage' &&
            register.structures[target.id].structureType != 'tower' &&
            register.structures[target.id].structureType != 'powerSpawn' &&
            register.structures[target.id].structureType != 'terminal' &&
            register.structures[target.id].structureType != 'container' &&
            register.structures[target.id].structureType != 'lab') {
                return C.ERR_INVALID_TARGET;
            }
        }
        else if(resourceType == C.RESOURCE_POWER) {
            if (register.structures[target.id] &&
            register.structures[target.id].structureType != 'storage' &&
            register.structures[target.id].structureType != 'terminal' &&
            register.structures[target.id].structureType != 'container' &&
            register.structures[target.id].structureType != 'powerSpawn') {
                return C.ERR_INVALID_TARGET;
            }
        }
        else {
            if (register.structures[target.id] &&
            register.structures[target.id].structureType != 'storage' &&
            register.structures[target.id].structureType != 'terminal' &&
            register.structures[target.id].structureType != 'container' &&
            register.structures[target.id].structureType != 'lab') {
                return C.ERR_INVALID_TARGET;
            }
        }

        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }

        var totalResources = utils.calcResources(data(this.id));
        var emptySpace = data(this.id).energyCapacity - totalResources;

        if(emptySpace <= 0) {
            return C.ERR_FULL;
        }

        if(target.structureType == 'powerSpawn') {
            if(!amount) {
                amount = Math.min( data(target.id)[resourceType], emptySpace );
            }
            if(!data(target.id)[resourceType] || data(target.id)[resourceType] < amount) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }
            if(amount > emptySpace) {
                return C.ERR_FULL;
            }
        }
        else if(target.structureType == 'lab') {
            if(resourceType != C.RESOURCE_ENERGY && data(target.id).mineralType && data(target.id).mineralType != resourceType) {
                return C.ERR_INVALID_ARGS;
            }

            var targetCapacity = resourceType == C.RESOURCE_ENERGY ? data(target.id).energyCapacity : data(target.id).mineralCapacity;
            var targetAmount = resourceType == C.RESOURCE_ENERGY ? data(target.id).energy : data(target.id).mineralAmount;

            if(!amount) {
                amount = Math.min( targetAmount, emptySpace );
            }

            if(!targetAmount || targetAmount < amount) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }
            if(amount > emptySpace) {
                return C.ERR_FULL;
            }
        }
        else {
            if(!amount) {
                amount = Math.min(data(target.id)[resourceType], emptySpace);
            }
            if(!data(target.id)[resourceType] || data(target.id)[resourceType] < amount) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }
            if(amount > emptySpace) {
                return C.ERR_FULL;
            }
        }

        intents.set(this.id, 'withdraw', {id: target.id, amount, resourceType});
        return C.OK;
    });

    Creep.prototype.pickup = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!target || !target.id || !register.energy[target.id] || !(target instanceof globals.Energy)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(utils.calcResources(this.carry) >= this.carryCapacity) {
            return C.ERR_FULL;
        }
        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }


        intents.set(this.id, 'pickup', {id: target.id});
        return C.OK;
    });

    Creep.prototype.getActiveBodyparts = register.wrapFn(function(type) {
        return _getActiveBodyparts(this.body, type);
    });

    Creep.prototype.attack = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!_hasActiveBodypart(this.body, C.ATTACK)) {
            return C.ERR_NO_BODYPART;
        }
        if(this.room.controller && !this.room.controller.my && this.room.controller.safeMode) {
            return C.ERR_NO_BODYPART;
        }
        if(!target || !target.id || !register.creeps[target.id] && !register.structures[target.id] ||
            !(target instanceof globals.Creep) && !(target instanceof globals.StructureSpawn) && !(target instanceof globals.Structure)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }


        intents.set(this.id, 'attack', {id: target.id, x: target.pos.x, y: target.pos.y});
        return C.OK;
    });

    Creep.prototype.rangedAttack = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!_hasActiveBodypart(this.body, C.RANGED_ATTACK)) {
            return C.ERR_NO_BODYPART;
        }
        if(this.room.controller && !this.room.controller.my && this.room.controller.safeMode) {
            return C.ERR_NO_BODYPART;
        }
        if(!target || !target.id || !register.creeps[target.id] && !register.structures[target.id] ||
            !(target instanceof globals.Creep) && !(target instanceof globals.StructureSpawn) && !(target instanceof globals.Structure)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!this.pos.inRangeTo(target, 3)) {
            return C.ERR_NOT_IN_RANGE;
        }


        intents.set(this.id, 'rangedAttack', {id: target.id});
        return C.OK;
    });

    Creep.prototype.rangedMassAttack = register.wrapFn(function() {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!_hasActiveBodypart(this.body, C.RANGED_ATTACK)) {
            return C.ERR_NO_BODYPART;
        }
        if(this.room.controller && !this.room.controller.my && this.room.controller.safeMode) {
            return C.ERR_NO_BODYPART;
        }


        intents.set(this.id, 'rangedMassAttack', {});
        return C.OK;
    });

    Creep.prototype.heal = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!_hasActiveBodypart(this.body, C.HEAL)) {
            return C.ERR_NO_BODYPART;
        }
        if(!target || !target.id || !register.creeps[target.id] || !(target instanceof globals.Creep)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }
        if(this.room.controller && !this.room.controller.my && this.room.controller.safeMode) {
            return C.ERR_NO_BODYPART;
        }


        intents.set(this.id, 'heal', {id: target.id, x: target.pos.x, y: target.pos.y});
        return C.OK;
    });

    Creep.prototype.rangedHeal = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!_hasActiveBodypart(this.body, C.HEAL)) {
            return C.ERR_NO_BODYPART;
        }
        if(!target || !target.id || !register.creeps[target.id] || !(target instanceof globals.Creep)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(this.room.controller && !this.room.controller.my && this.room.controller.safeMode) {
            return C.ERR_NO_BODYPART;
        }
        if(!this.pos.inRangeTo(target, 3)) {
            return C.ERR_NOT_IN_RANGE;
        }


        intents.set(this.id, 'rangedHeal', {id: target.id});
        return C.OK;
    });

    Creep.prototype.repair = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!_hasActiveBodypart(this.body, C.WORK)) {
            return C.ERR_NO_BODYPART;
        }
        if(!this.carry.energy) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(!target || !target.id || !register.structures[target.id] ||
            !(target instanceof globals.Structure) && !(target instanceof globals.StructureSpawn)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!this.pos.inRangeTo(target, 3)) {
            return C.ERR_NOT_IN_RANGE;
        }


        intents.set(this.id, 'repair', {id: target.id, x: target.pos.x, y: target.pos.y});
        return C.OK;
    });

    Creep.prototype.build = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!_hasActiveBodypart(this.body, C.WORK)) {
            return C.ERR_NO_BODYPART;
        }
        if(!this.carry.energy) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(!target || !target.id || !register.constructionSites[target.id] || !(target instanceof globals.ConstructionSite)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!this.pos.inRangeTo(target, 3)) {
            return C.ERR_NOT_IN_RANGE;
        }
        if(_.contains(C.OBSTACLE_OBJECT_TYPES, target.structureType) &&
            _.any(register.objectsByRoom[data(this.id).room], (i) => i.x == target.pos.x && i.y == target.pos.y && _.contains(C.OBSTACLE_OBJECT_TYPES, i.type))) {
            return C.ERR_INVALID_TARGET;
        }

        var buildPower = _getActiveBodyparts(this.body, C.WORK) * C.BUILD_POWER,
            buildRemaining = target.progressTotal - target.progress,
            buildEffect = Math.min(buildPower, buildRemaining, this.carry.energy);

        if (target.progress + buildEffect >= target.progressTotal &&
            !utils.checkControllerAvailability(target.structureType, register.objectsByRoom[data(this.id).room], this.room.controller, 1)) {
            return C.ERR_RCL_NOT_ENOUGH;
        }


        intents.set(this.id, 'build', {id: target.id, x: target.pos.x, y: target.pos.y});
        return C.OK;
    });

    Creep.prototype.suicide = register.wrapFn(function() {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }

        intents.set(this.id, 'suicide', {});
        return C.OK;
    });

    Creep.prototype.say = register.wrapFn(function(message, isPublic) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }

        intents.set(this.id, 'say', {message: ""+message, isPublic});
        return C.OK;
    });

    Creep.prototype.claimController = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }

        var controllersClaimed = runtimeData.user.rooms.length + controllersClaimedInTick;
        if (controllersClaimed &&
            (!runtimeData.user.gcl || runtimeData.user.gcl < utils.calcNeededGcl(controllersClaimed + 1))) {
            return C.ERR_GCL_NOT_ENOUGH;
        }
        if (controllersClaimed >= C.GCL_NOVICE && runtimeData.rooms[this.room.name].novice > Date.now()) {
            return C.ERR_FULL;
        }
        if(!target || !target.id || !register.structures[target.id] || !(target instanceof globals.Structure)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!_hasActiveBodypart(this.body, C.CLAIM)) {
            return C.ERR_NO_BODYPART;
        }
        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }
        if(target.structureType != 'controller') {
            return C.ERR_INVALID_TARGET;
        }
        if(target.level > 0) {
            return C.ERR_INVALID_TARGET;
        }
        if(target.reservation && target.reservation.username != runtimeData.user.username) {
            return C.ERR_INVALID_TARGET;
        }
        if(this.room.controller && !this.room.controller.my && this.room.controller.safeMode) {
            return C.ERR_NO_BODYPART;
        }

        controllersClaimedInTick++;

        intents.set(this.id, 'claimController', {id: target.id});
        return C.OK;
    });

    Creep.prototype.attackController = register.wrapFn(function(target) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!target || !target.id || !register.structures[target.id] || !(target instanceof globals.StructureController)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!_getActiveBodyparts(this.body, C.CLAIM)) {
            return C.ERR_NO_BODYPART;
        }
        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }
        if(!target.owner && !target.reservation) {
            return C.ERR_INVALID_TARGET;
        }
        if(data(target.id).upgradeBlocked > runtimeData.time) {
            return C.ERR_TIRED;
        }
        if(this.room.controller && !this.room.controller.my && this.room.controller.safeMode) {
            return C.ERR_NO_BODYPART;
        }

        intents.set(this.id, 'attackController', {id: target.id});
        return C.OK;
    });

    Creep.prototype.upgradeController = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!_hasActiveBodypart(this.body, C.WORK)) {
            return C.ERR_NO_BODYPART;
        }
        if(!this.carry.energy) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(!target || !target.id || !register.structures[target.id] || !(target instanceof globals.StructureController)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(target.upgradeBlocked && target.upgradeBlocked > 0) {
            return C.ERR_INVALID_TARGET;
        }
        if(!target.pos.inRangeTo(this.pos, 3)) {
            return C.ERR_NOT_IN_RANGE;
        }
        if(!target.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!target.level || !target.owner) {
            return C.ERR_INVALID_TARGET;
        }


        intents.set(this.id, 'upgradeController', {id: target.id});
        return C.OK;
    });

    Creep.prototype.reserveController = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
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
        if(target.owner) {
            return C.ERR_INVALID_TARGET;
        }
        if(target.reservation && target.reservation.username != runtimeData.user.username) {
            return C.ERR_INVALID_TARGET;
        }
        if(!_hasActiveBodypart(this.body, C.CLAIM)) {
            return C.ERR_NO_BODYPART;
        }


        intents.set(this.id, 'reserveController', {id: target.id});
        return C.OK;
    });

    Creep.prototype.notifyWhenAttacked = register.wrapFn(function(enabled) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!_.isBoolean(enabled)) {
            return C.ERR_INVALID_ARGS;
        }

        if(enabled != data(this.id).notifyWhenAttacked) {

            intents.set(this.id, 'notifyWhenAttacked', {enabled});
        }

        return C.OK;
    });

    Creep.prototype.cancelOrder = register.wrapFn(function(name) {

        if(intents.remove(this.id, name)) {
            return C.OK;
        }
        return C.ERR_NOT_FOUND;
    });

    Creep.prototype.dismantle = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!_hasActiveBodypart(this.body, C.WORK)) {
            return C.ERR_NO_BODYPART;
        }
        if(!target || !target.id || !register.structures[target.id] ||
        !(target instanceof globals.Structure) && !(target instanceof globals.StructureSpawn) ||
        (target instanceof globals.StructurePowerBank)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }
        if(this.room.controller && !this.room.controller.my && this.room.controller.safeMode) {
            return C.ERR_NO_BODYPART;
        }

        intents.set(this.id, 'dismantle', {id: target.id});
        return C.OK;
    });

    Creep.prototype.generateSafeMode = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!(data(this.id)[C.RESOURCE_GHODIUM] >= C.SAFE_MODE_COST)) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(!target || !target.id || !register.structures[target.id] || !(target instanceof globals.StructureController)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }

        intents.set(this.id, 'generateSafeMode', {id: target.id});
        return C.OK;
    });

    Creep.prototype.signController = register.wrapFn(function(target, sign) {

        if(this.spawning) {
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

        intents.set(this.id, 'signController', {id: target.id, sign: ""+sign});
        return C.OK;
    });


    globals.Creep = Creep;
};

