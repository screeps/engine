var utils = require('./../utils'),
    rooms = require('./rooms'),
    driver = utils.getRuntimeDriver(),
    C = driver.constants,
    _ = require('lodash');

var runtimeData, intents, register, globals, createdCreepNames, lastActivateSafeMode;

function data(id) {
    if(!runtimeData.roomObjects[id]) {
        throw new Error("Could not find an object with ID "+id);
    }
    return runtimeData.roomObjects[id];
}

function _storeGetter(o) {
    return new globals.Store(o);
}

exports.make = function(_runtimeData, _intents, _register, _globals) {

    runtimeData = _runtimeData;
    intents = _intents;
    register = _register;
    globals = _globals;

    createdCreepNames = [];
    lastActivateSafeMode = null;

    if(globals.Structure) {
        return;
    }

    /**
     * Structure
     * @param id
     * @constructor
     */
    var Structure = register.wrapFn(function(id) {

        var _data = data(id);
        globals.RoomObject.call(this, _data.x, _data.y, _data.room, _data.effects);
        this.id = id;

        var objectData = data(id);

        if(objectData.type == C.STRUCTURE_CONTROLLER) {
            register.rooms[objectData.room].controller = this;
        }

        if(objectData.type == C.STRUCTURE_STORAGE) {
            register.rooms[objectData.room].storage = this;
        }

        if(objectData.type == C.STRUCTURE_TERMINAL) {
            register.rooms[objectData.room].terminal = this;
        }
    });

    Structure.prototype = Object.create(globals.RoomObject.prototype);
    Structure.prototype.constructor = Structure;

    utils.defineGameObjectProperties(Structure.prototype, data, {
        hits: (o) => o.hits,
        hitsMax: (o) => o.hitsMax,
        structureType: (o) => o.type
    });

    Structure.prototype.toString = register.wrapFn(function() {
        return `[structure (${data(this.id).type}) #${this.id}]`;
    });

    Structure.prototype.destroy = register.wrapFn(function() {
        if(!this.room.controller || !this.room.controller.my) {
            return C.ERR_NOT_OWNER;
        }

        if(this.room.find(C.FIND_HOSTILE_CREEPS).length > 0 ||
            this.room.find(C.FIND_HOSTILE_POWER_CREEPS).length > 0) {
            return C.ERR_BUSY;
        }

        intents.pushByName('room', 'destroyStructure', {roomName: this.room.name, id: this.id});
        return C.OK;
    });

    Structure.prototype.notifyWhenAttacked = register.wrapFn(function(enabled) {

        if(this.my === false || (this.room.controller && this.room.controller.owner && !this.room.controller.my)) {
            return C.ERR_NOT_OWNER;
        }
        if(!_.isBoolean(enabled)) {
            return C.ERR_INVALID_ARGS;
        }

        if(enabled != data(this.id).notifyWhenAttacked) {

            intents.set(this.id, 'notifyWhenAttacked', {enabled});
        }

        return C.OK;
    });

    Structure.prototype.isActive = register.wrapFn(function() {
        if(!this.owner) {
            return true;
        }
        if(!C.CONTROLLER_STRUCTURES[data(this.id).type]) {
            return true;
        }
        if(!this.room.controller) {
            return false;
        }
        return utils.checkStructureAgainstController(data(this.id), register.objectsByRoom[data(this.id).room], data(this.room.controller.id));
    });

    Object.defineProperty(globals, 'Structure', {enumerable: true, value: Structure});

    /**
     * OwnedStructure
     * @param id
     * @constructor
     */

    var OwnedStructure = register.wrapFn(function(id) {
        Structure.call(this, id);
    });
    OwnedStructure.prototype = Object.create(Structure.prototype);
    OwnedStructure.prototype.constructor = OwnedStructure;

    utils.defineGameObjectProperties(OwnedStructure.prototype, data, {
        owner: (o) => _.isUndefined(o.user) || o.user === null ? undefined : {
                username: runtimeData.users[o.user].username
            },
        my: (o) => _.isUndefined(o.user) ? undefined : o.user == runtimeData.user._id
    });

    Object.defineProperty(globals, 'OwnedStructure', {enumerable: true, value: OwnedStructure});

    /**
     * StructureContainer
     * @param id
     * @constructor
     */
    var StructureContainer = register.wrapFn(function (id) {
        Structure.call(this, id);
    });
    StructureContainer.prototype = Object.create(Structure.prototype);
    StructureContainer.prototype.constructor = StructureContainer;

    utils.defineGameObjectProperties(StructureContainer.prototype, data, {
        store: _storeGetter,
        storeCapacity: o => o.storeCapacity,
        ticksToDecay: (o) => o.nextDecayTime ? o.nextDecayTime - runtimeData.time : o.decayTime ? o.decayTime - runtimeData.time : undefined,
    });

    Object.defineProperty(globals, 'StructureContainer', {enumerable: true, value: StructureContainer});

    /**
     * StructureController
     * @param id
     * @constructor
     */
    var StructureController = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureController.prototype = Object.create(OwnedStructure.prototype);
    StructureController.prototype.constructor = StructureController;

    utils.defineGameObjectProperties(StructureController.prototype, data, {
        ticksToDowngrade: (o) => o.downgradeTime ? o.downgradeTime - runtimeData.time : undefined,
        reservation: (o) => o.reservation ? {
                username: runtimeData.users[o.reservation.user].username,
                ticksToEnd: o.reservation.endTime - runtimeData.time
            } : undefined,
        level: (o) => o.level,
        progress: (o) => o.level > 0 ? o.progress : undefined,
        progressTotal: (o) => o.level > 0 && o.level < 8 ? C.CONTROLLER_LEVELS[o.level] : undefined,
        upgradeBlocked: o => o.upgradeBlocked && o.upgradeBlocked > runtimeData.time ? o.upgradeBlocked - runtimeData.time : undefined,
        safeMode: o => o.safeMode && o.safeMode > runtimeData.time ? o.safeMode - runtimeData.time : undefined,
        safeModeCooldown: o => o.safeModeCooldown && o.safeModeCooldown > runtimeData.time ? o.safeModeCooldown - runtimeData.time : undefined,
        safeModeAvailable: o => o.safeModeAvailable || 0,
        sign: o => o.hardSign ? {
                username: C.SYSTEM_USERNAME,
                text: o.hardSign.text,
                time: o.hardSign.time,
                datetime: new Date(o.hardSign.datetime)
            } : o.sign ? {
                username: runtimeData.users[o.sign.user].username,
                text: o.sign.text,
                time: o.sign.time,
                datetime: new Date(o.sign.datetime)
            } : undefined,
        isPowerEnabled: o => !!o.isPowerEnabled
    });

    StructureController.prototype.unclaim = register.wrapFn(function() {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }

        intents.set(this.id, 'unclaim', {});
        return C.OK;
    });

    StructureController.prototype.activateSafeMode = register.wrapFn(function() {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.safeModeAvailable <= 0) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(this.safeModeCooldown || this.upgradeBlocked > 0 ||
            this.ticksToDowngrade < C.CONTROLLER_DOWNGRADE[this.level]/2 - C.CONTROLLER_DOWNGRADE_SAFEMODE_THRESHOLD) {
            return C.ERR_TIRED;
        }
        if(_.any(register.structures, i => i.structureType == 'controller' && i.my && i.safeMode)) {
            return C.ERR_BUSY;
        }

        if(lastActivateSafeMode) {
            intents.remove(lastActivateSafeMode, 'activateSafeMode');
        }
        lastActivateSafeMode = this.id;

        intents.set(this.id, 'activateSafeMode', {});
        return C.OK;
    });

    Object.defineProperty(globals, 'StructureController', {enumerable: true, value: StructureController});

    /**
     * StructureExtension
     * @param id
     * @constructor
     */
    var StructureExtension = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureExtension.prototype = Object.create(OwnedStructure.prototype);
    StructureExtension.prototype.constructor = StructureExtension;

    utils.defineGameObjectProperties(StructureExtension.prototype, data, {
        energy: o => o.store ? o.store.energy : 0,
        energyCapacity: o => o.storeCapacityResource ? o.storeCapacityResource.energy || 0 : 0
    });

    Object.defineProperty(globals, 'StructureExtension', {enumerable: true, value: StructureExtension});

    /**
     * StructureExtractor
     * @param id
     * @constructor
     */
    var StructureExtractor = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureExtractor.prototype = Object.create(OwnedStructure.prototype);
    StructureExtractor.prototype.constructor = StructureExtractor;

    utils.defineGameObjectProperties(StructureExtractor.prototype, data, {
        cooldown: (o) => o.cooldown || 0
    });

    Object.defineProperty(globals, 'StructureExtractor', {enumerable: true, value: StructureExtractor});

    /**
     * StructureKeeperLair
     * @param id
     * @constructor
     */
    var StructureKeeperLair = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureKeeperLair.prototype = Object.create(OwnedStructure.prototype);
    StructureKeeperLair.prototype.constructor = StructureKeeperLair;

    utils.defineGameObjectProperties(StructureKeeperLair.prototype, data, {
        my: () => false,
        owner: () => ({username: 'Source Keeper'}),
        ticksToSpawn: (o) => o.nextSpawnTime ? o.nextSpawnTime - runtimeData.time : undefined
    });

    Object.defineProperty(globals, 'StructureKeeperLair', {enumerable: true, value: StructureKeeperLair});

    /**
     * StructureLab
     * @param id
     * @constructor
     */
    var StructureLab = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureLab.prototype = Object.create(OwnedStructure.prototype);
    StructureLab.prototype.constructor = StructureLab;

    const labMineralAmountGetter = o => _.sum(o.store) - (o.store.energy||0);
    const labMineralTypeGetter = o => _(o.store).keys().filter(k => k != C.RESOURCE_ENERGY && o.store[k]).first();

    utils.defineGameObjectProperties(StructureLab.prototype, data, {
        energy: o => o.store ? o.store.energy : 0,
        energyCapacity: o => o.storeCapacityResource ? o.storeCapacityResource.energy : 0,
        cooldown: o => o.cooldownTime && o.cooldownTime > runtimeData.time ? o.cooldownTime - runtimeData.time : 0,
        mineralAmount: labMineralAmountGetter,
        mineralCapacity: o => C.LAB_MINERAL_CAPACITY,
        mineralType: labMineralTypeGetter
    });

    StructureLab.prototype.runReaction = register.wrapFn(function(lab1, lab2) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.cooldown > 0) {
            return C.ERR_TIRED;
        }
        if(!utils.checkStructureAgainstController(data(this.id), register.objectsByRoom[data(this.id).room], data(this.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }
        if(!lab1 || !lab1.id || !register.structures[lab1.id] ||
        !(lab1 instanceof globals.Structure) || lab1.structureType != C.STRUCTURE_LAB || lab1.id == this.id) {
            register.assertTargetObject(lab1);
            return C.ERR_INVALID_TARGET;
        }
        if(!lab2 || !lab2.id || !register.structures[lab2.id] ||
        !(lab2 instanceof globals.Structure) || lab2.structureType != C.STRUCTURE_LAB || lab2.id == this.id) {
            register.assertTargetObject(lab2);
            return C.ERR_INVALID_TARGET;
        }
        if(this.pos.getRangeTo(lab1) > 2 || this.pos.getRangeTo(lab2) > 2) {
            return C.ERR_NOT_IN_RANGE;
        }
        var reactionAmount = C.LAB_REACTION_AMOUNT;
        var effect = _.find(this.effects, i => i.power == C.PWR_OPERATE_LAB);
        if(effect && effect.ticksRemaining > 0) {
            reactionAmount += C.POWER_INFO[C.PWR_OPERATE_LAB].effect[effect.level-1];
        }
        if(this.mineralAmount > this.mineralCapacity - reactionAmount) {
            return C.ERR_FULL;
        }
        if(lab1.mineralAmount < reactionAmount || lab2.mineralAmount < reactionAmount) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(!(lab1.mineralType in C.REACTIONS) || !C.REACTIONS[lab1.mineralType][lab2.mineralType] ||
        this.mineralType && this.mineralType != C.REACTIONS[lab1.mineralType][lab2.mineralType]) {
            return C.ERR_INVALID_ARGS;
        }

        intents.set(this.id, 'runReaction', {lab1: lab1.id, lab2: lab2.id});
        return C.OK;
    });

    StructureLab.prototype.boostCreep = register.wrapFn(function(target, bodyPartsCount) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!utils.checkStructureAgainstController(data(this.id), register.objectsByRoom[data(this.id).room], data(this.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }
        if(!target || !target.id || !register.creeps[target.id] || !(target instanceof globals.Creep) || target.spawning) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!this.pos.isNearTo(target)) {
            return C.ERR_NOT_IN_RANGE;
        }
        if(data(this.id).store.energy < C.LAB_BOOST_ENERGY) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(labMineralAmountGetter(data(this.id)) < C.LAB_BOOST_MINERAL) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        bodyPartsCount = bodyPartsCount || 0;
        var nonBoostedParts = _(target.body).filter(i => !i.boost && C.BOOSTS[i.type] && C.BOOSTS[i.type][labMineralTypeGetter(data(this.id))]).size();

        if(!nonBoostedParts || bodyPartsCount && bodyPartsCount > nonBoostedParts) {
            return C.ERR_NOT_FOUND;
        }

        intents.set(this.id, 'boostCreep', {id: target.id, bodyPartsCount});
        return C.OK;
    });

    StructureLab.prototype.unboostCreep = register.wrapFn(function(target) {
        if(!target || !target.id || !register.creeps[target.id] || !(target instanceof globals.Creep)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!this.my || !target.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!utils.checkStructureAgainstController(data(this.id), register.objectsByRoom[data(this.id).room], data(this.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }
        if(this.cooldown > 0) {
            return C.ERR_TIRED;
        }
        if(!_.some(target.body, p => !!p.boost)) {
            return C.ERR_NOT_FOUND;
        }
        if(!this.pos.isNearTo(target)) {
            return C.ERR_NOT_IN_RANGE;
        }

        intents.set(this.id, 'unboostCreep', {id: target.id});
        return C.OK;
    });

    Object.defineProperty(globals, 'StructureLab', {enumerable: true, value: StructureLab});

    /**
     * StructureLink
     * @param id
     * @constructor
     */
    var StructureLink = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureLink.prototype = Object.create(OwnedStructure.prototype);
    StructureLink.prototype.constructor = StructureLink;

    utils.defineGameObjectProperties(StructureLink.prototype, data, {
        energy: o => o.store ? o.store.energy : 0,
        energyCapacity: o => o.storeCapacityResource ? o.storeCapacityResource.energy || 0 : 0,
        cooldown: (o) => o.cooldown || 0,
    });

    StructureLink.prototype.transferEnergy = register.wrapFn(function(target, amount) {

        if (amount < 0) {
            return C.ERR_INVALID_ARGS;
        }
        if (!target || !target.id || !register.structures[target.id] || !(target instanceof globals.Structure) || target === this || target.structureType != C.STRUCTURE_LINK) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if (!target.my) {
            return C.ERR_NOT_OWNER;
        }
        if(this.my === false && _.any(this.pos.lookFor('structure'), i => i.structureType == C.STRUCTURE_RAMPART)) {
            return C.ERR_NOT_OWNER;
        }

        if(this.cooldown > 0) {
            return C.ERR_TIRED;
        }
        if(!this.room.controller) {
            return C.ERR_RCL_NOT_ENOUGH;
        }
        if(!utils.checkStructureAgainstController(data(this.id), register.objectsByRoom[data(this.id).room], data(this.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }

        if (!data(this.id).store || !data(this.id).store.energy) {
            return C.ERR_NOT_ENOUGH_ENERGY;
        }
        if (!amount) {
            amount = Math.min(data(this.id).store.energy, data(target.id).storeCapacityResource ? data(target.id).storeCapacityResource.energy - data(target.id).store.energy : 0);
        }
        if (this.energy < amount) {
            return C.ERR_NOT_ENOUGH_ENERGY;
        }
        if (!data(target.id).storeCapacityResource || !data(target.id).storeCapacityResource.energy || data(target.id).store.energy + amount > data(target.id).storeCapacityResource.energy) {
            return C.ERR_FULL;
        }
        if (target.pos.roomName != this.pos.roomName) {
            return C.ERR_NOT_IN_RANGE;
        }

        intents.set(this.id, 'transfer', {id: target.id, amount, resourceType: 'energy'});
        return C.OK;

    });

    Object.defineProperty(globals, 'StructureLink', {enumerable: true, value: StructureLink});

    /**
     * StructureObserver
     * @param id
     * @constructor
     */
    var StructureObserver = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureObserver.prototype = Object.create(OwnedStructure.prototype);
    StructureObserver.prototype.constructor = StructureObserver;

    StructureObserver.prototype.observeRoom = register.wrapFn(function(roomName) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!_.isString(roomName) || !/^(W|E)\d+(S|N)\d+$/.test(roomName)) {
            return C.ERR_INVALID_ARGS;
        }
        if(!utils.checkStructureAgainstController(data(this.id), register.objectsByRoom[data(this.id).room], data(this.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }

        var [tx,ty] = utils.roomNameToXY(roomName);
        var [x,y] = utils.roomNameToXY(data(this.id).room);

        var effect = _.find(this.effects, i => i.power == C.PWR_OPERATE_OBSERVER);
        if((!effect || effect.ticksRemaining <= 0) &&
            (Math.abs(tx-x) > C.OBSERVER_RANGE || Math.abs(ty-y) > C.OBSERVER_RANGE)) {
            return C.ERR_NOT_IN_RANGE;
        }

        intents.set(this.id, 'observeRoom', {roomName});
        return C.OK;
    });

    Object.defineProperty(globals, 'StructureObserver', {enumerable: true, value: StructureObserver});

    /**
     * StructurePowerBank
     * @param id
     * @constructor
     */
    var StructurePowerBank = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructurePowerBank.prototype = Object.create(OwnedStructure.prototype);
    StructurePowerBank.prototype.constructor = StructurePowerBank;

    utils.defineGameObjectProperties(StructurePowerBank.prototype, data, {
        power: (o) => o.power,
        ticksToDecay: (o) => o.nextDecayTime ? o.nextDecayTime - runtimeData.time : o.decayTime ? o.decayTime - runtimeData.time : undefined,
        my: () => false,
        owner: () => ({username: 'Power Bank'})
    });

    Object.defineProperty(globals, 'StructurePowerBank', {enumerable: true, value: StructurePowerBank});

    /**
     * StructurePowerSpawn
     * @param id
     * @constructor
     */
    var StructurePowerSpawn = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructurePowerSpawn.prototype = Object.create(OwnedStructure.prototype);
    StructurePowerSpawn.prototype.constructor = StructurePowerSpawn;

    utils.defineGameObjectProperties(StructurePowerSpawn.prototype, data, {
        energy: o => o.store ? o.store.energy : 0,
        energyCapacity: o => o.storeCapacityResource ? o.storeCapacityResource.energy : 0,
        power: o => o.store ? o.store.power : 0,
        powerCapacity: o => o.storeCapacityResource ? o.storeCapacityResource.power : 0
    });

    StructurePowerSpawn.prototype.processPower = register.wrapFn(function() {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!utils.checkStructureAgainstController(data(this.id), register.objectsByRoom[data(this.id).room], data(this.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }
        var amount = 1;
        var effect = _.find(this.effects, i => i.power == C.PWR_OPERATE_POWER);
        if(effect && effect.ticksRemaining > 0) {
            amount += C.POWER_INFO[C.PWR_OPERATE_POWER].effect[effect.level-1];
        }
        if(this.power < amount || this.energy < amount * C.POWER_SPAWN_ENERGY_RATIO) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }

        intents.set(this.id, 'processPower', {});
        return C.OK;
    });

    Object.defineProperty(globals, 'StructurePowerSpawn', {enumerable: true, value: StructurePowerSpawn});

    /**
     * StructureRampart
     * @param id
     * @constructor
     */
    var StructureRampart = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureRampart.prototype = Object.create(OwnedStructure.prototype);
    StructureRampart.prototype.constructor = StructureRampart;

    utils.defineGameObjectProperties(StructureRampart.prototype, data, {
        ticksToDecay: (o) => o.nextDecayTime ? o.nextDecayTime - runtimeData.time : o.decayTime ? o.decayTime - runtimeData.time : undefined,
        isPublic: o => !!o.isPublic
    });

    StructureRampart.prototype.setPublic = register.wrapFn(function(isPublic) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        intents.set(this.id, 'setPublic', {isPublic: !!isPublic});
        return C.OK;
    });

    Object.defineProperty(globals, 'StructureRampart', {enumerable: true, value: StructureRampart});

    /**
     * StructureRoad
     * @param id
     * @constructor
     */
    var StructureRoad = register.wrapFn(function(id) {
        Structure.call(this, id);
    });
    StructureRoad.prototype = Object.create(Structure.prototype);
    StructureRoad.prototype.constructor = StructureRoad;

    utils.defineGameObjectProperties(StructureRoad.prototype, data, {
        ticksToDecay: (o) => o.nextDecayTime ? o.nextDecayTime - runtimeData.time : o.decayTime ? o.decayTime - runtimeData.time : undefined
    });

    Object.defineProperty(globals, 'StructureRoad', {enumerable: true, value: StructureRoad});


    /**
     * StructureStorage
     * @param id
     * @constructor
     */
    var StructureStorage = register.wrapFn(function(id) {
        OwnedStructure.call(this, id);
    });
    StructureStorage.prototype = Object.create(OwnedStructure.prototype);
    StructureStorage.prototype.constructor = StructureStorage;

    utils.defineGameObjectProperties(StructureStorage.prototype, data, {
        store: _storeGetter,
        storeCapacity: o => o.storeCapacity
    });

    Object.defineProperty(globals, 'StructureStorage', {enumerable: true, value: StructureStorage});

    /**
     * StructureTerminal
     * @param id
     * @constructor
     */
    var StructureTerminal = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureTerminal.prototype = Object.create(OwnedStructure.prototype);
    StructureTerminal.prototype.constructor = StructureTerminal;

    utils.defineGameObjectProperties(StructureTerminal.prototype, data, {
        store: _storeGetter,
        storeCapacity: o => o.storeCapacity,
        cooldown: o => o.cooldownTime && o.cooldownTime > runtimeData.time ? o.cooldownTime - runtimeData.time : 0
    });

    StructureTerminal.prototype.send = register.wrapFn(function(resourceType, amount, targetRoomName, description) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!utils.checkStructureAgainstController(data(this.id), register.objectsByRoom[data(this.id).room], data(this.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }
        if(!/^(W|E)\d+(N|S)\d+$/.test(targetRoomName)) {
            return C.ERR_INVALID_ARGS;
        }
        if(!_.contains(C.RESOURCES_ALL, resourceType)) {
            return C.ERR_INVALID_ARGS;
        }
        if(!data(this.id).store || !data(this.id).store[resourceType] || data(this.id).store[resourceType] < amount) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(data(this.id).cooldownTime > runtimeData.time) {
            return C.ERR_TIRED;
        }
        var range = utils.calcRoomsDistance(data(this.id).room, targetRoomName, true);
        var cost = utils.calcTerminalEnergyCost(amount,range);
        if(resourceType != C.RESOURCE_ENERGY && data(this.id).store.energy < cost ||
        resourceType == C.RESOURCE_ENERGY && data(this.id).store.energy < amount + cost) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }
        if(description && (!_.isString(description) || description.length > 100)) {
            return C.ERR_INVALID_ARGS;
        }

        intents.set(this.id, 'send', {resourceType, amount, targetRoomName, description});
        return C.OK;
    });

    Object.defineProperty(globals, 'StructureTerminal', {enumerable: true, value: StructureTerminal});

    /**
     * StructureTower
     * @param id
     * @constructor
     */
    var StructureTower = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureTower.prototype = Object.create(OwnedStructure.prototype);
    StructureTower.prototype.constructor = StructureTower;

    utils.defineGameObjectProperties(StructureTower.prototype, data, {
        energy: o => o.store ? o.store.energy : 0,
        energyCapacity: o => o.storeCapacityResource ? o.storeCapacityResource.energy || 0 : 0,
    });

    StructureTower.prototype.attack = register.wrapFn(function(target) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!target || !target.id || !register.creeps[target.id] && !register.powerCreeps[target.id] && !register.structures[target.id] ||
        !(target instanceof globals.Creep) && !(target instanceof globals.PowerCreep) && !(target instanceof globals.StructureSpawn) && !(target instanceof globals.Structure)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!data(this.id).store || (data(this.id).store.energy < C.TOWER_ENERGY_COST)) {
            return C.ERR_NOT_ENOUGH_ENERGY;
        }
        if(!utils.checkStructureAgainstController(data(this.id), register.objectsByRoom[data(this.id).room], data(this.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }

        intents.set(this.id, 'attack', {id: target.id});
        return C.OK;
    });

    StructureTower.prototype.heal = register.wrapFn(function(target) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!target || !target.id || !register.creeps[target.id] && !register.powerCreeps[target.id] ||
            !(target instanceof globals.Creep) && !(target instanceof globals.PowerCreep)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!data(this.id).store || (data(this.id).store.energy < C.TOWER_ENERGY_COST)) {
            return C.ERR_NOT_ENOUGH_ENERGY;
        }
        if(!utils.checkStructureAgainstController(data(this.id), register.objectsByRoom[data(this.id).room], data(this.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }

        intents.set(this.id, 'heal', {id: target.id});
        return C.OK;
    });

    StructureTower.prototype.repair = register.wrapFn(function(target) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!target || !target.id || !register.structures[target.id] ||
        !(target instanceof globals.Structure) && !(target instanceof globals.StructureSpawn)) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!data(this.id).store || (data(this.id).store.energy < C.TOWER_ENERGY_COST)) {
            return C.ERR_NOT_ENOUGH_ENERGY;
        }
        if(!utils.checkStructureAgainstController(data(this.id), register.objectsByRoom[data(this.id).room], data(this.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }

        intents.set(this.id, 'repair', {id: target.id});
        return C.OK;
    });

    Object.defineProperty(globals, 'StructureTower', {enumerable: true, value: StructureTower});

    /**
     * StructureWall
     * @param id
     * @constructor
     */
    var StructureWall = register.wrapFn(function (id) {
        Structure.call(this, id);
    });
    StructureWall.prototype = Object.create(Structure.prototype);
    StructureWall.prototype.constructor = StructureWall;

    utils.defineGameObjectProperties(StructureWall.prototype, data, {
        ticksToLive: (o) => o.ticksToLive,
    });

    Object.defineProperty(globals, 'StructureWall', {enumerable: true, value: StructureWall});


    /**
     * StructureSpawn
     * @param id
     * @constructor
     */
    var StructureSpawn = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureSpawn.prototype = Object.create(OwnedStructure.prototype);
    StructureSpawn.prototype.constructor = StructureSpawn;

    utils.defineGameObjectProperties(StructureSpawn.prototype, data, {
        name: (o) => o.name,
        energy: o => o.store ? o.store.energy : 0,
        energyCapacity: o => o.storeCapacityResource ? o.storeCapacityResource.energy || 0 : 0,
        spawning: (o, id) => o.spawning ? new StructureSpawn.Spawning(id) : null,
        store: _storeGetter
    });

    Object.defineProperty(StructureSpawn.prototype, 'memory', {
        get: function() {
            if(!this.my) {
                return undefined;
            }
            if(_.isUndefined(globals.Memory.spawns) || globals.Memory.spawns === 'undefined') {
                globals.Memory.spawns = {};
            }
            if(!_.isObject(globals.Memory.spawns)) {
                return undefined;
            }
            return globals.Memory.spawns[data(this.id).name] = globals.Memory.spawns[data(this.id).name] || {};
        },

        set: function(value) {
            if(!this.my) {
                throw new Error('Could not set other player\'s spawn memory');
            }
            if(_.isUndefined(globals.Memory.spawns) || globals.Memory.spawns === 'undefined') {
                globals.Memory.spawns = {};
            }
            if(!_.isObject(globals.Memory.spawns)) {
                throw new Error('Could not set spawn memory');
            }
            globals.Memory.spawns[data(this.id).name] = value;
        }
    });

    StructureSpawn.prototype.toString = register.wrapFn(function() {
        return `[spawn ${data(this.id).user == runtimeData.user._id ? data(this.id).name : '#'+this.id}]`;
    });

    StructureSpawn.prototype.canCreateCreep = register.wrapFn(function(body, name) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(data(this.id).spawning) {
            return C.ERR_BUSY;
        }
        if(!body || !_.isArray(body) || body.length == 0 || body.length > C.MAX_CREEP_SIZE) {
            return C.ERR_INVALID_ARGS;
        }
        for(var i=0; i<body.length; i++) {
            if(!_.contains(C.BODYPARTS_ALL, body[i]))
                return C.ERR_INVALID_ARGS;
        }

        if(this.room.energyAvailable < utils.calcCreepCost(body)) {
            return C.ERR_NOT_ENOUGH_ENERGY;
        }

        if(runtimeData.roomObjects[this.id].off) {
            return C.ERR_RCL_NOT_ENOUGH;
        }

        if(name && (globals.Game.creeps[name] || createdCreepNames.indexOf(name) != -1)) {
            return C.ERR_NAME_EXISTS;
        }

        return C.OK;
    });

    StructureSpawn.prototype.createCreep = register.wrapFn(function(body, name, creepMemory) {

        if(_.isObject(name) && _.isUndefined(creepMemory)) {
            creepMemory = name;
            name = undefined;
        }

        var canResult = this.canCreateCreep(body, name);
        if(canResult != C.OK) {
            return canResult;
        }

        if(!name) {
            name = require('./names').getUniqueName((i) => {
                return _.any(runtimeData.roomObjects, {type: 'creep', user: data(this.id).user, name: i}) ||
                createdCreepNames.indexOf(i) != -1;
            });
        }

        createdCreepNames.push(name);

        if(_.isUndefined(globals.Memory.creeps)) {
            globals.Memory.creeps = {};
        }
        if(_.isObject(globals.Memory.creeps)) {
            if(!_.isUndefined(creepMemory)) {
                globals.Memory.creeps[name] = creepMemory;
            }
            else {
                globals.Memory.creeps[name] = globals.Memory.creeps[name] || {};
            }
        }

        globals.Game.creeps[name] = new globals.Creep();
        globals.RoomObject.call(globals.Game.creeps[name], this.pos.x, this.pos.y, this.pos.roomName);
        Object.defineProperties(globals.Game.creeps[name], {
            name: {
                enumerable: true,
                get() {
                    return name;
                }
            },
            spawning: {
                enumerable: true,
                get() {
                    return true;
                }
            },
            my: {
                enumerable: true,
                get() {
                    return true;
                }
            },
            body: {
                enumerable: true,
                get() {
                    return _.map(body, type => ({type, hits: 100}))
                }
            },
            owner: {
                enumerable: true,
                get() {
                    return new Object({username: runtimeData.user.username});
                }
            },
            ticksToLive: {
                enumerable: true,
                get() {
                    return C.CREEP_LIFE_TIME;
                }
            },
            carryCapacity: {
                enumerable: true,
                get() {
                    return _.reduce(body, (result, type) => result += type == C.CARRY ? C.CARRY_CAPACITY : 0, 0);
                }
            },
            carry: {
                enumerable: true,
                get() {
                    return {energy: 0};
                }
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
                    return body.length * 100;
                }
            },
            hitsMax: {
                enumerable: true,
                get() {
                    return body.length * 100;
                }
            },
            saying: {
                enumerable: true,
                get() {
                    return undefined;
                }
            }
        });

        intents.set(this.id, 'createCreep', {name, body});
        return name;
    });

    function calcEnergyAvailable(roomObjects, energyStructures){
        return _.sum(energyStructures, id => {
            if (roomObjects[id] && !roomObjects[id].off && (roomObjects[id].type === 'spawn' || roomObjects[id].type === 'extension') && roomObjects[id].store) {
                return roomObjects[id].store.energy;
            } else {
                return 0;
            }
        });
    }

    StructureSpawn.prototype.spawnCreep = register.wrapFn(function spawnCreep(body, name, options = {}) {

        if(!name || !_.isObject(options)) {
            return C.ERR_INVALID_ARGS;
        }

        if(globals.Game.creeps[name] || createdCreepNames.indexOf(name) != -1) {
            return C.ERR_NAME_EXISTS;
        }

        let energyStructures = options.energyStructures && _.uniq(_.map(options.energyStructures, 'id'));

        let directions = options.directions;
        if(directions !== undefined) {
            if(!_.isArray(directions)) {
                return C.ERR_INVALID_ARGS;
            }
            // convert directions to numbers, eliminate duplicates
            directions = _.uniq(_.map(directions, d => +d));
            // bail if any numbers are out of bounds or non-integers
            if(directions.length ==0 || !_.all(directions, direction => direction >= 1 && direction <= 8 && direction === (direction | 0))) {
                return C.ERR_INVALID_ARGS;
            }
        }

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }

        if(data(this.id).spawning) {
            return C.ERR_BUSY;
        }

        if(data(this.id).off) {
            return C.ERR_RCL_NOT_ENOUGH;
        }

        if(!body || !_.isArray(body) || body.length === 0 || body.length > C.MAX_CREEP_SIZE) {
            return C.ERR_INVALID_ARGS;
        }

        for(let i=0; i<body.length; i++) {
            if(!_.contains(C.BODYPARTS_ALL, body[i]))
                return C.ERR_INVALID_ARGS;
        }

        let energyAvailable = energyStructures ? calcEnergyAvailable(runtimeData.roomObjects, energyStructures) : this.room.energyAvailable;
        if(energyAvailable < utils.calcCreepCost(body)) {
            return C.ERR_NOT_ENOUGH_ENERGY;
        }

        if(options.dryRun) {
            return C.OK;
        }

        createdCreepNames.push(name);

        if(_.isUndefined(globals.Memory.creeps)) {
            globals.Memory.creeps = {};
        }

        if(_.isObject(globals.Memory.creeps)) {
            globals.Memory.creeps[name] = options.memory || globals.Memory.creeps[name] || {};
        }

        globals.Game.creeps[name] = new globals.Creep();
        globals.RoomObject.call(globals.Game.creeps[name], this.pos.x, this.pos.y, this.pos.roomName);
        Object.defineProperties(globals.Game.creeps[name], {
            name: {
                enumerable: true,
                get() {
                    return name;
                }
            },
            spawning: {
                enumerable: true,
                get() {
                    return true;
                }
            },
            my: {
                enumerable: true,
                get() {
                    return true;
                }
            },
            body: {
                enumerable: true,
                get() {
                    return _.map(body, type => ({type, hits: 100}))
                }
            },
            owner: {
                enumerable: true,
                get() {
                    return new Object({username: runtimeData.user.username});
                }
            },
            ticksToLive: {
                enumerable: true,
                get() {
                    return C.CREEP_LIFE_TIME;
                }
            },
            carryCapacity: {
                enumerable: true,
                get() {
                    return _.reduce(body, (result, type) => result += type === C.CARRY ? C.CARRY_CAPACITY : 0, 0);
                }
            },
            carry: {
                enumerable: true,
                get() {
                    return {energy: 0};
                }
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
                    return body.length * 100;
                }
            },
            hitsMax: {
                enumerable: true,
                get() {
                    return body.length * 100;
                }
            },
            saying: {
                enumerable: true,
                get() {
                    return undefined;
                }
            }
        });

        intents.set(this.id, 'createCreep', {name, body, energyStructures, directions});

        return C.OK;
    });

    StructureSpawn.prototype.notifyWhenAttacked = register.wrapFn(function(enabled) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!_.isBoolean(enabled)) {
            return C.ERR_INVALID_ARGS;
        }

        if(enabled != data(this.id).notifyWhenAttacked) {

            intents.set(this.id, 'notifyWhenAttacked', {enabled});
        }

        return C.OK;
    });

    StructureSpawn.prototype.renewCreep = register.wrapFn(function(target) {

        if(this.spawning) {
            return C.ERR_BUSY;
        }
        if(!target || !target.id || !register.creeps[target.id] || !(target instanceof globals.Creep) || target.spawning) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(!this.my || !target.my) {
            return C.ERR_NOT_OWNER;
        }
        if(runtimeData.roomObjects[this.id].off) {
            return C.ERR_RCL_NOT_ENOUGH;
        }
        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }
        if(this.room.energyAvailable < Math.ceil(C.SPAWN_RENEW_RATIO * utils.calcCreepCost(target.body) / C.CREEP_SPAWN_TIME / target.body.length)) {
            return C.ERR_NOT_ENOUGH_ENERGY;
        }
        if(target.ticksToLive + Math.floor(C.SPAWN_RENEW_RATIO * C.CREEP_LIFE_TIME / C.CREEP_SPAWN_TIME / target.body.length) > C.CREEP_LIFE_TIME) {
            return C.ERR_FULL;
        }
        if(_.any(target.body, i => !!i.boost)) {
            register.deprecated('Using `StructureSpawn.renewCreep` on a boosted creep is deprecated and will throw an error soon. Please remove boosts using `StructureLab.unboostCreep` before renewing.');
        }

        intents.set(this.id, 'renewCreep', {id: target.id});
        return C.OK;
    });

    StructureSpawn.prototype.recycleCreep = register.wrapFn(function(target) {

        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!target || !target.id || !register.creeps[target.id] || !(target instanceof globals.Creep) || target.spawning) {
            register.assertTargetObject(target);
            return C.ERR_INVALID_TARGET;
        }
        if(runtimeData.roomObjects[this.id].off) {
            return C.ERR_RCL_NOT_ENOUGH;
        }
        if(!target.my) {
            return C.ERR_NOT_OWNER;
        }
        if(!target.pos.isNearTo(this.pos)) {
            return C.ERR_NOT_IN_RANGE;
        }

        intents.set(this.id, 'recycleCreep', {id: target.id});
        return C.OK;
    });

    Object.defineProperty(globals, 'StructureSpawn', {enumerable: true, value: StructureSpawn});
    Object.defineProperty(globals, 'Spawn', {enumerable: true, value: StructureSpawn});

    /**
     * SpawnSpawning
     * @param {Number} spawnId
     * @param {Object} properties
     * @constructor
     */
    StructureSpawn.Spawning = register.wrapFn(function(spawnId) {
        Object.defineProperty(this, 'spawn', {
            enumerable: false,
            value: register._objects[spawnId]
        });
        this.name = data(spawnId).spawning.name;
        this.needTime = data(spawnId).spawning.needTime;
        this.remainingTime = data(spawnId).spawning.remainingTime;
        this.directions = data(spawnId).spawning.directions;
    });

    StructureSpawn.Spawning.prototype.setDirections = register.wrapFn(function(directions) {
        if(!this.spawn.my) {
            return C.ERR_NOT_OWNER;
        }
        if(_.isArray(directions) && directions.length > 0) {
            // convert directions to numbers, eliminate duplicates
            directions = _.uniq(_.map(directions, e => +e));
            // bail if any numbers are out of bounds or non-integers
            if(!_.any(directions, (direction)=>direction < 1 || direction > 8 || direction !== (direction | 0))) {
                intents.set(this.spawn.id, 'setSpawnDirections', {directions});
                return C.OK;
            }
        }
        return C.ERR_INVALID_ARGS;
    });

    StructureSpawn.Spawning.prototype.cancel = register.wrapFn(function() {
        if(!this.spawn.my) {
            return C.ERR_NOT_OWNER;
        }
        intents.set(this.spawn.id, 'cancelSpawning', {});
        return C.OK;
    });

    /**
     * StructureNuker
     * @param id
     * @constructor
     */
    var StructureNuker = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureNuker.prototype = Object.create(OwnedStructure.prototype);
    StructureNuker.prototype.constructor = StructureNuker;

    utils.defineGameObjectProperties(StructureNuker.prototype, data, {
        energy: o => o.store ? o.store.energy : 0,
        energyCapacity: o => o.storeCapacityResource ? o.storeCapacityResource.energy : 0,
        ghodium: o => o.store ? o.store.G : 0,
        ghodiumCapacity: o => o.storeCapacityResource ? o.storeCapacityResource.G : 0,
        cooldown: o => o.cooldownTime && o.cooldownTime > runtimeData.time ? o.cooldownTime - runtimeData.time : 0
    });

    StructureNuker.prototype.launchNuke = register.wrapFn(function(pos) {
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }
        if(runtimeData.rooms[this.room.name].novice > Date.now() || runtimeData.rooms[this.room.name].respawnArea > Date.now()) {
            return C.ERR_INVALID_TARGET;
        }
        if(!(pos instanceof globals.RoomPosition)) {
            return C.ERR_INVALID_TARGET;
        }
        if(this.cooldown > 0) {
            return C.ERR_TIRED;
        }
        if(!utils.checkStructureAgainstController(data(this.id), register.objectsByRoom[data(this.id).room], data(this.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }
        var [tx,ty] = utils.roomNameToXY(pos.roomName);
        var [x,y] = utils.roomNameToXY(data(this.id).room);

        if(Math.abs(tx-x) > C.NUKE_RANGE || Math.abs(ty-y) > C.NUKE_RANGE) {
            return C.ERR_NOT_IN_RANGE;
        }
        if(!this.energy < this.energyCapacity || this.ghodium < this.ghodiumCapacity) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }

        intents.set(this.id, 'launchNuke', {roomName: pos.roomName, x: pos.x, y: pos.y});
        return C.OK;
    });

    Object.defineProperty(globals, 'StructureNuker', {enumerable: true, value: StructureNuker});


    /**
     * StructurePortal
     * @param id
     * @constructor
     */
    var StructurePortal = register.wrapFn(function (id) {
        Structure.call(this, id);
    });
    StructurePortal.prototype = Object.create(Structure.prototype);
    StructurePortal.prototype.constructor = StructurePortal;

    utils.defineGameObjectProperties(StructurePortal.prototype, data, {
        destination: o => {
            if(o.destination.shard) {
                return {
                    shard: o.destination.shard,
                    room: o.destination.room
                };
            }
            else {
                return new globals.RoomPosition(o.destination.x, o.destination.y, o.destination.room);
            }
        },
        ticksToDecay: (o) => o.decayTime ? o.decayTime - runtimeData.time : undefined
    });

    Object.defineProperty(globals, 'StructurePortal', {enumerable: true, value: StructurePortal});

    const StructureFactory = register.wrapFn(function (id) {
        OwnedStructure.call(this, id);
    });
    StructureFactory.prototype = Object.create(OwnedStructure.prototype);
    StructureFactory.prototype.constructor = StructureFactory;

    utils.defineGameObjectProperties(StructureFactory.prototype, data, {
        level: o => o.level,
        store: _storeGetter,
        storeCapacity: o => o.storeCapacity,
        cooldown: o => o.cooldownTime && o.cooldownTime > runtimeData.time ? o.cooldownTime - runtimeData.time : 0
    });

    StructureFactory.prototype.produce = register.wrapFn(function(resourceType){
        if(!this.my) {
            return C.ERR_NOT_OWNER;
        }

        if(this.cooldown > 0) {
            return C.ERR_TIRED;
        }

        if(!C.COMMODITIES[resourceType]) {
            return C.ERR_INVALID_ARGS;
        }

        const rawFactory = data(this.id);
        if(!!C.COMMODITIES[resourceType].level && C.COMMODITIES[resourceType].level != rawFactory.level) {
            return C.ERR_INVALID_TARGET;
        }

        if(!utils.checkStructureAgainstController(rawFactory, register.objectsByRoom[rawFactory.room], data(this.room.controller.id))) {
            return C.ERR_RCL_NOT_ENOUGH;
        }

        if(!!C.COMMODITIES[resourceType].level && (rawFactory.level > 0) && !_.some(rawFactory.effects, e => e.power == C.PWR_OPERATE_FACTORY && e.level == C.COMMODITIES[resourceType].level && e.endTime >= runtimeData.time)) {
            return C.ERR_BUSY;
        }

        if(_.some(_.keys(C.COMMODITIES[resourceType].components), p => (rawFactory.store[p]||0)<C.COMMODITIES[resourceType].components[p])) {
            return C.ERR_NOT_ENOUGH_RESOURCES;
        }

        if (!rawFactory.storeCapacity || (utils.calcResources(rawFactory) - utils.calcResources(C.COMMODITIES[resourceType].components) + (C.COMMODITIES[resourceType].amount||1) > rawFactory.storeCapacity)) {
            return C.ERR_FULL;
        }

        intents.set(this.id, 'produce', {resourceType});
        return C.OK;
    });

    Object.defineProperty(globals, 'StructureFactory', {enumerable: true, value: StructureFactory});
};
