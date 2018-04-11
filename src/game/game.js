'use strict';
(function() {
    var _ = require('lodash'),
        utils = require('../utils'),
        driver = utils.getDriver(),
        C = driver.constants,
        map = require('./map'),
        market = require('./market'),
        customPrototypes = require('./custom-prototypes');

    var baseTime;
    //var process = {hrtime: function() {}}

    function _markTime(userId, str) {
        /*var time = process.hrtime(baseTime);
         time = time[0]*1e3 + time[1]/1e6;
         baseTime = process.hrtime();
         console.log('user '+userId+' runtime game '+str+' time: '+time);*/
    }


    function populateRegister(reg, spatial) {
        _.extend(reg, {
            creeps: {},
            structures: {},
            ownedStructures: {},
            spawns: {},
            sources: {},
            energy: {},
            flags: {},
            constructionSites: {},
            minerals: {},
            tombstones: {},
            nukes: {}
        });

        if(spatial) {
            var keys = Object.keys(reg);
            reg.spatial = {};
            keys.forEach((i) => {
                reg.spatial[i] = new Array(2500);
            });
        }
    }

    var findCacheFn = {
        [C.FIND_CREEPS]: (i) => !i.spawning,
        [C.FIND_MY_CREEPS]: (i) => !i.spawning && i.my,
        [C.FIND_HOSTILE_CREEPS]: (i) => !i.spawning && !i.my,
        [C.FIND_MY_SPAWNS]: (i) =>  i.my === true,
        [C.FIND_HOSTILE_SPAWNS]: (i) =>  i.my === false,
        [C.FIND_SOURCES_ACTIVE]: (i) => i.energy > 0,
        [C.FIND_MY_STRUCTURES]: (i) =>  i.my === true,
        [C.FIND_HOSTILE_STRUCTURES]: (i) =>  i.my === false && i.owner,
        [C.FIND_MY_CONSTRUCTION_SITES]: (i) =>  i.my,
        [C.FIND_HOSTILE_CONSTRUCTION_SITES]: (i) =>  i.my === false
    };

    function addObjectToFindCache(register, type, objectInstance, objectRaw) {
        if(!findCacheFn[type] || findCacheFn[type](objectInstance)) {
            register.findCache[type] = register.findCache[type] || {};
            register.findCache[type][objectRaw.room] = register.findCache[type][objectRaw.room] || [];
            register.findCache[type][objectRaw.room].push(objectInstance);
        }
    }

    function addObjectToRegister(register, type, objectInstance, objectRaw) {
        register[type][objectInstance.id] = objectInstance;
        register.byRoom[objectRaw.room][type][objectInstance.id] = objectInstance;
        let index = objectRaw.x * 50 + objectRaw.y;
        let spatial = register.byRoom[objectRaw.room].spatial[type];
        if (spatial[index] === undefined) {
            spatial[index] = [ objectInstance ];
        } else {
            spatial[index].push(objectInstance);
        }
    }

    driver.config.makeGameObject = function makeGameObject (runtimeData, intents, memory, getUsedCpuFn, globals, markStats, sandboxedFunctionWrapper) {

        var customObjectsInfo = {};

        if(driver.customObjectPrototypes) {
            driver.customObjectPrototypes.forEach(i => {
                i.opts = i.opts || {};
                customObjectsInfo[i.objectType] = {
                    name: i.name,
                    make: customPrototypes(i.name, i.opts.parent, i.opts.properties, i.opts.prototypeExtender,
                        !!i.opts.userOwned),
                    findConstant: i.opts.findConstant
                };
            });
        }

        var register = {
            _useNewPathFinder: true,
            _objects: {},
            byRoom: {},
            findCache: {},
            rooms: {},
            wrapFn: sandboxedFunctionWrapper
        };

        var deprecatedShown = [];

        register.deprecated = (msg) => {
            if (!_.contains(deprecatedShown, msg)) {
                deprecatedShown.push(msg);
                globals.console.log(msg);
            }
        };

        register.assertTargetObject = (obj) => {
            if(obj && _.isPlainObject(obj) && _.isString(obj.id) && obj.id.length == 24) {
                throw new Error("It seems you're trying to use a serialized game object stored in Memory which is not allowed. Please use `Game.getObjectById` to retrieve a live object reference instead.");
            }
        };

        populateRegister(register);

        var gclLevel = Math.floor(Math.pow((runtimeData.user.gcl || 0) / C.GCL_MULTIPLY, 1 / C.GCL_POW)) + 1,
        gclBaseProgress = Math.pow(gclLevel - 1, C.GCL_POW) * C.GCL_MULTIPLY;

        var game = {
            creeps: {},
            spawns: {},
            structures: {},
            flags: {},
            constructionSites: {},
            rooms: {},
            time: runtimeData.time,
            cpuLimit: runtimeData.cpu,
            cpu: {
                getUsed(){
                    return getUsedCpuFn();
                },
                tickLimit: runtimeData.cpu,
                limit: runtimeData.user.cpu,
                bucket: runtimeData.cpuBucket
            },
            map: {},
            gcl: {
                level: gclLevel,
                progress: (runtimeData.user.gcl || 0) - gclBaseProgress,
                progressTotal: Math.pow(gclLevel, C.GCL_POW) * C.GCL_MULTIPLY - gclBaseProgress
            },
            market: {},
            resources: {
                [C.SUBSCRIPTION_TOKEN]: runtimeData.user.subscriptionTokens || 0
            },
            getObjectById(id) {
                return register._objects[id] || null;
            },
            notify(message, groupInterval) {
                if (intents.push('notify', {message, groupInterval}, 20)) {
                    return C.OK;
                }
                else {
                    return C.ERR_FULL;
                }
            }
        };

        _markTime(runtimeData.user._id, 'before objects by room');

        register.objectsByRoom = {};
        register.objectsByRoomKeys = {};
        _.forEach(runtimeData.roomObjects, (i, key) => {
            if (i.temp) {
                return;
            }
            register.objectsByRoom[i.room] = register.objectsByRoom[i.room] || {};
            register.objectsByRoom[i.room][key] = i;
            register.objectsByRoomKeys[i.room] = register.objectsByRoomKeys[i.room] || [];
            register.objectsByRoomKeys[i.room].push(key);
        });

        _markTime(runtimeData.user._id, 'after objects by room');


        for (var i in runtimeData.rooms) {
            register.byRoom[i] = {};
            populateRegister(register.byRoom[i], true);
        }

        _markTime(runtimeData.user._id,'requires 0');
        require('./rooms').make(runtimeData, intents, register, globals);
        require('./rooms').makePos(register, globals);
        require('./creeps').make(runtimeData, intents, register, globals);
        require('./structures').make(runtimeData, intents, register, globals);
        require('./sources').make(runtimeData, intents, register, globals);
        require('./minerals').make(runtimeData, intents, register, globals);
        require('./nukes').make(runtimeData, intents, register, globals);
        require('./resources').make(runtimeData, intents, register, globals);
        require('./flags').make(runtimeData, intents, register, globals);
        require('./tombstones').make(runtimeData, intents, register, globals);
        require('./construction-sites').make(runtimeData, intents, register, globals);
        require('./path-finder').make(runtimeData, intents, register, globals);

        for (var i in runtimeData.rooms) {
            register.rooms[i] = new globals.Room(i);
        }

        for(var i in customObjectsInfo) {
            customObjectsInfo[i].make(runtimeData, intents, register, globals);
        }


        game.rooms = _.clone(register.rooms);

        var structureTypes = {
            rampart: globals.StructureRampart,
            road: globals.StructureRoad,
            extension: globals.StructureExtension,
            constructedWall: globals.StructureWall,
            keeperLair: globals.StructureKeeperLair,
            controller: globals.StructureController,
            link: globals.StructureLink,
            storage: globals.StructureStorage,
            tower: globals.StructureTower,
            observer: globals.StructureObserver,
            powerBank: globals.StructurePowerBank,
            powerSpawn: globals.StructurePowerSpawn,
            lab: globals.StructureLab,
            extractor: globals.StructureExtractor,
            terminal: globals.StructureTerminal,
            container: globals.StructureContainer,
            spawn: globals.StructureSpawn,
            nuker: globals.StructureNuker,
            portal: globals.StructurePortal
        };

        _markTime(runtimeData.user._id, 'before objects');

        var c = {};

        for(var i in runtimeData.roomObjects) {
            var object = runtimeData.roomObjects[i];

            if (object.temp) {
                continue;
            }

            c[object.type] = c[object.type] || 0;
            c[object.type]++;

            if (object.type == 'creep') {
                register._objects[i] = new globals.Creep(i);
                addObjectToRegister(register, 'creeps', register._objects[i], object);
                if (runtimeData.userObjects[i]) {
                    if (game.creeps[register.creeps[i].name]) {
                        register.creeps[i].suicide();
                    }
                    else {
                        game.creeps[register.creeps[i].name] = register.creeps[i];
                    }
                }

                addObjectToFindCache(register, C.FIND_CREEPS, register.creeps[i], object);
                addObjectToFindCache(register, C.FIND_MY_CREEPS, register.creeps[i], object);
                addObjectToFindCache(register, C.FIND_HOSTILE_CREEPS, register.creeps[i], object);
            }
            if (structureTypes[object.type]) {
                register._objects[i] = new structureTypes[object.type](i);
                addObjectToRegister(register, 'structures', register._objects[i], object);

                if (register._objects[i] instanceof globals.OwnedStructure) {
                    if (runtimeData.userObjects[i]) {
                        game.structures[register.structures[i].id] = register.structures[i];
                    }
                    addObjectToRegister(register, 'ownedStructures', register._objects[i], object);
                }

                addObjectToFindCache(register, C.FIND_STRUCTURES, register.structures[i], object);
                addObjectToFindCache(register, C.FIND_MY_STRUCTURES, register.structures[i], object);
                addObjectToFindCache(register, C.FIND_HOSTILE_STRUCTURES, register.structures[i], object);

                if(object.type == 'spawn') {
                    addObjectToRegister(register, 'spawns', register._objects[i], object);

                    if (runtimeData.userObjects[i]) {
                        game.spawns[register.spawns[i].name] = register.spawns[i];
                    }

                    addObjectToFindCache(register, C.FIND_MY_SPAWNS, register.spawns[i], object);
                    addObjectToFindCache(register, C.FIND_HOSTILE_SPAWNS, register.spawns[i], object);
                }

            }
            if (!object.off && (object.type == 'extension' || object.type == 'spawn') && (object.user == runtimeData.user._id)) {
                register.rooms[object.room].energyAvailable += object.energy;
                register.rooms[object.room].energyCapacityAvailable += object.energyCapacity;
            }
            if (object.type == 'source') {
                register._objects[i] = new globals.Source(i);
                addObjectToRegister(register, 'sources', register._objects[i], object);
                addObjectToFindCache(register, C.FIND_SOURCES, register.sources[i], object);
                addObjectToFindCache(register, C.FIND_SOURCES_ACTIVE, register.sources[i], object);
            }
            if (object.type == 'mineral') {
                register._objects[i] = new globals.Mineral(i);
                addObjectToRegister(register, 'minerals', register._objects[i], object);
                addObjectToFindCache(register, C.FIND_MINERALS, register.minerals[i], object);
            }
            if (object.type == 'energy') {
                register._objects[i] = new globals.Energy(i);
                addObjectToRegister(register, 'energy', register._objects[i], object);
                addObjectToFindCache(register, C.FIND_DROPPED_RESOURCES, register.energy[i], object);
            }
            if (object.type == 'nuke') {
                register._objects[i] = new globals.Nuke(i);
                addObjectToRegister(register, 'nukes', register._objects[i], object);
                addObjectToFindCache(register, C.FIND_NUKES, register._objects[i], object);
            }
            if (object.type == 'tombstone') {
                register._objects[i] = new globals.Tombstone(i);
                addObjectToRegister(register, 'tombstones', register._objects[i], object);
                addObjectToFindCache(register, C.FIND_TOMBSTONES, register._objects[i], object);
            }

            if (object.type == 'constructionSite') {
                register._objects[i] = new globals.ConstructionSite(i);
                if (runtimeData.userObjects[i]) {
                    game.constructionSites[register._objects[i].id] = register._objects[i];
                    if (!register.byRoom[runtimeData.userObjects[i].room]) {
                        register.byRoom[runtimeData.userObjects[i].room] = {};
                        populateRegister(register.byRoom[runtimeData.userObjects[i].room], true);
                    }
                }

                addObjectToRegister(register, 'constructionSites', register._objects[i], object);
                if(runtimeData.rooms[object.room]) {
                    addObjectToFindCache(register, C.FIND_CONSTRUCTION_SITES, register.constructionSites[i], object);
                    addObjectToFindCache(register, C.FIND_MY_CONSTRUCTION_SITES, register.constructionSites[i], object);
                    addObjectToFindCache(register, C.FIND_HOSTILE_CONSTRUCTION_SITES, register.constructionSites[i], object);
                }
            }

            if(customObjectsInfo[object.type]) {
                register._objects[i] = new globals[customObjectsInfo[object.type].name](i);
                if(customObjectsInfo[object.type].findConstant) {
                    addObjectToFindCache(register, customObjectsInfo[object.type].findConstant, register._objects[i], object);
                }
            }

        }

        _markTime(runtimeData.user._id, 'after objects 1');

        runtimeData.flags.forEach(flagRoomData => {

            var data = flagRoomData.data.split("|");
            data.forEach(flagData => {
                if(!flagData) {
                    return;
                }
                var info = flagData.split("~");
                info[0] = info[0].replace(/\$VLINE\$/g,"|").replace(/\$TILDE\$/g,"~");
                var id = 'flag_'+info[0];
                var flag = register._objects[id] = new globals.Flag(info[0], info[1], info[2], flagRoomData.room, info[3], info[4]);

                register.flags[id] = flag;
                if(register.byRoom[flagRoomData.room]) {
                    register.byRoom[flagRoomData.room].flags[id] = flag;
                    let index = (+info[3]) * 50 + (+info[4]);
                    let spatial = register.byRoom[flagRoomData.room].spatial.flags;
                    if (spatial[index] === undefined) {
                        spatial[index] = [ flag ];
                    } else {
                        spatial[index].push(flag);
                    }
                }

                game.flags[info[0]] = flag;

                if(!findCacheFn[C.FIND_FLAGS] || findCacheFn[C.FIND_FLAGS](flag)) {
                    register.findCache[C.FIND_FLAGS] = register.findCache[C.FIND_FLAGS] || {};
                    register.findCache[C.FIND_FLAGS][flagRoomData.room] = register.findCache[C.FIND_FLAGS][flagRoomData.room] || [];
                    register.findCache[C.FIND_FLAGS][flagRoomData.room].push(flag);
                }
            })
        });

        _markTime(runtimeData.user._id, 'after objects 2');

        game.map = register.map = map.makeMap(runtimeData, register);

        markStats('beforeMarket');

        game.market = register.market = market.make(runtimeData, intents, register);

        markStats('afterMarket');

        _.extend(globals, JSON.parse(JSON.stringify(C)));

        markStats('afterCloneConstants');

        return game;
    };

    (function() {
        
        var runCodeCache = {};

        exports.runCode = function (_globals, _sandboxedFunctionWrapper, _codeModules, _runtimeData, _intents, _memory, _fakeConsole, _consoleCommands, _timeout, _getUsedCpu, _resetUsedCpu, _markStats, _scriptCachedData) {

            var userId = _runtimeData.user._id;

            runCodeCache[userId] = runCodeCache[userId] || {};
            runCodeCache[userId].globals = _globals;
            runCodeCache[userId].sandboxedFunctionWrapper = _sandboxedFunctionWrapper;
            runCodeCache[userId].codeModules = _codeModules;
            runCodeCache[userId].runtimeData = _runtimeData;
            runCodeCache[userId].intents = _intents;
            runCodeCache[userId].memory = _memory;
            runCodeCache[userId].fakeConsole = _fakeConsole;
            runCodeCache[userId].consoleCommands = _consoleCommands;
            runCodeCache[userId].timeout = _timeout;
            runCodeCache[userId].getUsedCpu = _getUsedCpu;
            runCodeCache[userId].resetUsedCpu = _resetUsedCpu;
            runCodeCache[userId].markStats = _markStats || function() {};
            runCodeCache[userId].scriptCachedData = _scriptCachedData;

            _.extend(runCodeCache[userId].globals, {
                RawMemory: runCodeCache[userId].memory,
                console: runCodeCache[userId].fakeConsole
            });

            if(!runCodeCache[userId].globals._) {
                runCodeCache[userId].globals._ = _.runInContext();
            }

            Object.defineProperty(runCodeCache[userId].globals, 'Memory', {
                configurable: true,
                enumerable: true,
                get() {

                    try {
                        runCodeCache[userId].memory._parsed = JSON.parse(runCodeCache[userId].memory.get() || "{}");
                        runCodeCache[userId].memory._parsed.__proto__ = null;
                    }
                    catch(e) {
                        runCodeCache[userId].memory._parsed = null;
                    }

                    Object.defineProperty(runCodeCache[userId].globals, 'Memory', {
                        configurable: true,
                        enumerable: true,
                        value: runCodeCache[userId].memory._parsed
                    });

                    return runCodeCache[userId].memory._parsed;
                }
            });

            runCodeCache[userId].markStats('beforeMake');

            runCodeCache[userId].globals.Game = driver.config.makeGameObject(
                runCodeCache[userId].runtimeData,
                runCodeCache[userId].intents,
                runCodeCache[userId].memory,
                runCodeCache[userId].getUsedCpu,
                runCodeCache[userId].globals,
                runCodeCache[userId].markStats,
                runCodeCache[userId].sandboxedFunctionWrapper,
                _markTime);

            runCodeCache[userId].markStats('afterMake');

            _markTime(userId,'markGameObject');

            if (runCodeCache[userId].runtimeData.user._id == '2') {
                runCodeCache[userId].codeModules = {
                    main: "PathFinder.use(true);  var  healer  =  require('healer'),  findAttack  =  require('findAttack');  for  (var  i  in  Game.creeps)  {  var  creep  =  Game.creeps[i];  if  (!creep.room)  {  continue;  }  if  (creep.getActiveBodyparts('heal')  >  0)  {  healer(creep);  }  else  {  findAttack(Game.creeps[i]);  }  require('shootAtWill')(creep);  }  for  (var  i  in  Memory.creeps)  {  if  (!Game.creeps[i])  {  delete  Memory.creeps[i];  }  }",
                    findAttack: "var flee = require('flee'); function checkPath(pos1, pos2) { var path = pos1.findPathTo(pos2); if (!path.length) { return false; } return path[path.length - 1].x == pos2.x && path[path.length - 1].y == pos2.y; } function costCallbackIgnoreRamparts(roomName, cm) { var ramparts = Game.rooms[roomName].find(FIND_STRUCTURES, {filter: i => i.structureType == STRUCTURE_RAMPART || i.structureType == STRUCTURE_WALL}); ramparts.forEach(i => cm.set(i.pos.x, i.pos.y, 0)); } module.exports = function (creep) { if (!creep.getActiveBodyparts(ATTACK) && creep.getActiveBodyparts(RANGED_ATTACK) && flee(creep, 3)) { return; } var target, healers = creep.room.find(FIND_MY_CREEPS, { filter: function (i) { return i.getActiveBodyparts('heal') > 0; } }); if (creep.hits < creep.hitsMax / 2 && healers.length > 0 && !creep.getActiveBodyparts(ATTACK)) { target = creep.pos.findClosestByPath(FIND_MY_CREEPS, { ignoreRoads: true, filter: function (i) { return i.getActiveBodyparts('heal') > 0; } }); if (!target || creep.moveTo(target, {maxRooms: 1, ignoreRoads: true}) != OK) { target = null; } } var nearCreeps = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 1, { filter: function (i) { return i.owner.username != 'Source Keeper' } }); if (nearCreeps) { creep.attack(nearCreeps[0]); } if (!target) { target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, { ignoreRoads: true, ignoreCreeps: true, filter: function (i) { return i.owner.username != 'Source Keeper' } }); if (target && (creep.getActiveBodyparts(ATTACK) || !creep.pos.inRangeTo(target, 3))) { creep.moveTo(target, {maxRooms: 1, ignoreRoads: true, ignoreCreeps: true}); } } if (!target) { target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, { ignoreRoads: true, filter: function (i) { return i.owner.username != 'Source Keeper' }, costCallback: costCallbackIgnoreRamparts }); if (target && (creep.getActiveBodyparts(ATTACK) || !creep.pos.inRangeTo(target, 3))) { creep.moveTo(target, {maxRooms: 1, ignoreRoads: true, costCallback: costCallbackIgnoreRamparts}); } } if (!target) { target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS, { ignoreDestructibleStructures: true, ignoreRoads: true, filter: function (i) { return i.owner.username != 'Source Keeper' } }); if (target && (creep.getActiveBodyparts(ATTACK) || !creep.pos.inRangeTo(target, 3))) { creep.moveTo(target, {ignoreDestructibleStructures: true, maxRooms: 1, ignoreRoads: true}); } } if (!target) { if (creep.room.controller && creep.room.controller.level > 0 && !creep.room.find(FIND_HOSTILE_CREEPS).length) { var spawns = _.filter(creep.room.find(FIND_HOSTILE_SPAWNS), spawn => !checkPath(creep.pos, spawn.pos)); if (!spawns.length) { creep.suicide(); return; } target = spawns[0]; if (target) { creep.moveTo(target, {ignoreDestructibleStructures: true, maxRooms: 1, ignoreRoads: true}); } } return; } creep.attack(target); if ((creep.getActiveBodyparts(WORK) > 0 || creep.getActiveBodyparts(ATTACK) > 0) && creep.memory._move && creep.memory._move.path) { var path = Room.deserializePath(creep.memory._move.path); if (path.length && creep.pos.isNearTo(path[0].x, path[0].y)) { var structures = creep.room.lookForAt('structure', path[0].x, path[0].y); if (structures.length > 0) { creep.attack(structures[0]); creep.dismantle(structures[0]); } } } }",
                    flee: "var rooms = require('rooms'); module.exports = function(creep, range) { var nearCreeps = creep.pos.findInRange(FIND_HOSTILE_CREEPS, range-1, {filter: i => i.getActiveBodyparts(ATTACK) > 0 || i.getActiveBodyparts(RANGED_ATTACK) > 0}); if(nearCreeps.length > 0) { var ret = PathFinder.search(creep.pos, _.map(nearCreeps, i => ({pos: i.pos, range: range})), { maxRooms: 1, flee: true, roomCallback(roomName) { if(!rooms.rooms[roomName] || rooms.rooms[roomName].time < Game.time) { rooms.rooms[roomName] = {costMatrix: rooms.createCostMatrix(roomName), time: Game.time}; } return rooms.rooms[roomName].costMatrix; } }); if(ret.path.length) { creep.moveTo(ret.path[0]); creep.say('flee'); return true; } } return false; }",
                    healer: "var flee = require('flee'); module.exports = function (creep) { var target; var healTargets = creep.pos.findInRange(FIND_MY_CREEPS, 3); if(healTargets.length > 0) { healTargets = healTargets.sort((a,b) => (b.hitsMax - b.hits) - (a.hitsMax - a.hits)); if (creep.pos.isNearTo(healTargets[0])) { creep.heal(healTargets[0]); } else { creep.rangedHeal(healTargets[0]); } } if (creep.hits < creep.hitsMax / 2) { if (!flee(creep)) { target = creep.pos.findClosestByPath(FIND_MY_CREEPS, {filter: i => i.getActiveBodyparts('heal') > 0}); if (target) { creep.moveTo(target, {maxRooms: 1, ignoreRoads: true}); } } return; } target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {filter: i => i.hits < i.hitsMax}); if (!target) { if (flee(creep, 4)) { return; } target = creep.pos.findClosestByRange(FIND_MY_CREEPS, {filter: i => i != creep && i.getActiveBodyparts(HEAL) == 0}); } if (!target) { creep.suicide(); return; } if (creep.pos.isNearTo(target)) { creep.move(creep.pos.getDirectionTo(target)); } else { creep.moveTo(target, {maxRooms: 1, ignoreRoads: true, reusePath: 0}); } if (creep.getActiveBodyparts(RANGED_ATTACK)) { require('shootAtWill')(creep); } }",
                    rooms: "module.exports = { rooms: {}, createCostMatrix(roomName) { var cm = new PathFinder.CostMatrix; Game.rooms[roomName].find(FIND_CREEPS).forEach(i => cm.set(i.pos.x, i.pos.y, 255)); Game.rooms[roomName].find(FIND_STRUCTURES).forEach(i => { if(i.structureType != STRUCTURE_ROAD && i.structureType != STRUCTURE_CONTAINER) { cm.set(i.pos.x, i.pos.y, 255); } }); return cm; } } ",
                    shootAtWill: "module.exports = function (creep) { if(!creep.getActiveBodyparts(RANGED_ATTACK)) { return; } var targets = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3, { filter: function (i) { return i.owner.username != 'Source Keeper' } }); if (!targets.length) { targets = creep.pos.findInRange(FIND_STRUCTURES, 3, { filter: function (i) { return i.structureType == STRUCTURE_RAMPART || i.structureType == STRUCTURE_WALL; } }); } var min = -1, target; for (var i in targets) { if (min == -1 || min > targets[i].hits) { target = targets[i]; min = targets[i].hits; } } creep.rangedAttack(target); }"
                };
                runCodeCache[userId].runtimeData.userCodeTimestamp = 2;
            }

            if (runCodeCache[userId].runtimeData.user._id == '3') {
                runCodeCache[userId].codeModules = {
                    main: "PathFinder.use(true); /*console.log('start',Game.getUsedCpu(), _.size(_.filter(Game.creeps, {my: true}))); */ for (var i in Game.creeps) { var creep = Game.creeps[i], source = undefined; if (!creep.room) { continue; } if (creep.memory.sourceId) { source = Game.getObjectById(creep.memory.sourceId); } if(!source) { source = creep.pos.findInRange(FIND_SOURCES, 5)[0] || creep.pos.findInRange(FIND_MINERALS, 5)[0]; if (source) { creep.memory.sourceId = source.id; } } if (source) { if (!creep.pos.isNearTo(source)) { if (creep.moveTo(source, {reusePath: 50}) == ERR_NO_PATH) { delete creep.memory._move; creep.moveTo(source, {reusePath: 50, ignoreDestructibleStructures: true}); } } } var enemies = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 1, { filter: function (i) { return i.owner.username != 'Invader' } }); if (enemies.length) { enemies.sort(function (a, b) { return a.hits - b.hits; }); creep.attack(enemies[0]); } var enemies = creep.pos.findInRange(FIND_HOSTILE_CREEPS, 3, { filter: function (i) { return i.owner.username != 'Invader' } }); if (enemies.length) { var massDmg = 0, distanceDmg = {1: 10, 2: 4, 3: 1}; for (var i in enemies) { var distance = Math.max(Math.abs(enemies[i].pos.x - creep.pos.x), Math.abs(enemies[i].pos.y - creep.pos.y)); massDmg += distanceDmg[distance]; } if (massDmg > 13) { creep.rangedMassAttack(); } else { enemies.sort(function (a, b) { return a.hits - b.hits; }); creep.rangedAttack(enemies[0]); } } for (var i in Memory.creeps) { if (!Game.creeps[i]) { delete Memory.creeps[i]; } } }"
                };
                runCodeCache[userId].runtimeData.userCodeTimestamp = 2;
            }


            if(!runCodeCache[userId].globals.require ||
                runCodeCache[userId].runtimeData.userCodeTimestamp != runCodeCache[userId].globals.require.timestamp ||
                !_.isObject(runCodeCache[userId].globals.require.cache.main) || !_.isFunction(runCodeCache[userId].globals.require.cache.main.loop)) {

                runCodeCache[userId].globals.require = runCodeCache[userId].sandboxedFunctionWrapper(requireFn.bind(runCodeCache[userId]));
                runCodeCache[userId].globals.require.cache = {lodash: runCodeCache[userId].globals._};
                runCodeCache[userId].globals.require.timestamp = runCodeCache[userId].runtimeData.userCodeTimestamp;
            }

            driver.config.emit('playerSandbox',runCodeCache[userId].globals, userId, runCodeCache[userId]);

            runCodeCache[userId].resetUsedCpu();

            var mainExports = runCodeCache[userId].globals.require('main');
            if(_.isObject(mainExports) && _.isFunction(mainExports.loop)) {

                if(runCodeCache[userId].globals.require.initGlobals) {
                    _.forEach(runCodeCache[userId].globals.require.initGlobals, (i) => i());
                }

                driver.evalCode({
                    exports: mainExports,
                    user: runCodeCache[userId].runtimeData.user._id,
                    timestamp: runCodeCache[userId].runtimeData.userCodeTimestamp,
                    name: '__mainLoop',
                    code: 'module.exports.loop();'
                }, runCodeCache[userId].globals, false, runCodeCache[userId].timeout);
            }

            if (runCodeCache[userId].consoleCommands) {
                for (var i = 0; i < runCodeCache[userId].consoleCommands.length; i++) {
                    var result = driver.evalCode({
                        exports: {},
                        user: runCodeCache[userId].runtimeData.user._id,
                        name: '_console' + new Date().getTime() + '_' + i,
                        code: runCodeCache[userId].consoleCommands[i].expression
                    }, runCodeCache[userId].globals, true);
                    if (!runCodeCache[userId].consoleCommands[i].hidden) {
                        runCodeCache[userId].fakeConsole.commandResult(result);
                    }
                }
            }
        };
    })();

    function requireFn(moduleName){

        moduleName = moduleName.replace(/^\.\//,'');

        if (!(moduleName in this.globals.require.cache)) {

            if (_.isUndefined(this.codeModules[moduleName])) {
                throw new Error(`Unknown module '${moduleName}'`);
            }

            if(_.isObject(this.codeModules[moduleName]) && this.codeModules[moduleName].binary !== undefined) {
                this.globals.require.cache[moduleName] = driver.bufferFromBase64(this.codeModules[moduleName].binary);
            }
            else {
                this.globals.require.cache[moduleName] = -1;

                var moduleObject = {
                    exports: {},
                    user: this.runtimeData.user._id,
                    timestamp: this.runtimeData.userCodeTimestamp,
                    name: moduleName,
                    code: this.codeModules[moduleName]
                };

                try {
                    driver.evalCode(moduleObject, this.globals, false, this.timeout, this.scriptCachedData);
                }
                catch (e) {
                    delete this.globals.require.cache[moduleName];
                    throw e;
                }

                this.globals.require.cache[moduleName] = moduleObject.exports;
                if (moduleObject.__initGlobals) {
                    this.globals.require.initGlobals = this.globals.require.initGlobals || {};
                    this.globals.require.initGlobals[moduleName] = moduleObject.__initGlobals;
                }
            }
        }
        else if (this.globals.require.cache[moduleName] === -1) {
            throw new Error(`Circular reference to module '${moduleName}'`)
        }
        return this.globals.require.cache[moduleName];
    }
})();
