'use strict';
(function() {
    var _ = require('lodash'),
        utils = require('../utils'),
        driver = utils.getRuntimeDriver(),
        C = driver.constants,
        map = require('./map'),
        market = require('./market'),
        customPrototypes = require('./custom-prototypes');

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
            deposits: {},
            tombstones: {},
            nukes: {},
            powerCreeps: {},
            ruins: {},
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
        [C.FIND_MY_POWER_CREEPS]: (i) => i.my,
        [C.FIND_HOSTILE_POWER_CREEPS]: (i) => !i.my,
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

    function makeGameObject ({runtimeData, intents, memory, getUsedCpu, globals, sandboxedFunctionWrapper, getHeapStatistics, cpuHalt}) {

        var customObjectsInfo = {};

        // if(driver.customObjectPrototypes) {
        //     driver.customObjectPrototypes.forEach(i => {
        //         i.opts = i.opts || {};
        //         customObjectsInfo[i.objectType] = {
        //             name: i.name,
        //             make: customPrototypes(i.name, i.opts.parent, i.opts.properties, i.opts.prototypeExtender,
        //                 !!i.opts.userOwned),
        //             findConstant: i.opts.findConstant
        //         };
        //     });
        // }

        var register = {
            _useNewPathFinder: true,
            _objects: {},
            byRoom: {},
            findCache: {},
            rooms: {},
            roomEventLogCache: {},
            wrapFn: sandboxedFunctionWrapper || function(fn) { return fn }
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

        var gplLevel = Math.floor(Math.pow((runtimeData.user.power || 0) / C.POWER_LEVEL_MULTIPLY, 1 / C.POWER_LEVEL_POW)),
            gplBaseProgress = Math.pow(gplLevel, C.POWER_LEVEL_POW) * C.POWER_LEVEL_MULTIPLY;

        var game = {
            creeps: {},
            powerCreeps: {},
            spawns: {},
            structures: {},
            flags: {},
            constructionSites: {},
            rooms: {},
            time: runtimeData.time,
            cpuLimit: runtimeData.cpu,
            cpu: {
                getUsed(){
                    return getUsedCpu();
                },
                tickLimit: runtimeData.cpu,
                limit: runtimeData.user.cpu,
                bucket: runtimeData.cpuBucket,
                getHeapStatistics: getHeapStatistics ? function() {
                    return getHeapStatistics();
                } : undefined,
                halt: cpuHalt ? function() {
                    cpuHalt.applySync();
                    throw new Error("No one should ever see this message.");
                } : undefined,
            },
            map: {},
            gcl: {
                level: gclLevel,
                progress: (runtimeData.user.gcl || 0) - gclBaseProgress,
                progressTotal: Math.pow(gclLevel, C.GCL_POW) * C.GCL_MULTIPLY - gclBaseProgress
            },
            gpl: {
                level: gplLevel,
                progress: (runtimeData.user.power || 0) - gplBaseProgress,
                progressTotal: Math.pow(gplLevel+1, 2) * 1000 - gplBaseProgress
            },
            market: {},
            resources: JSON.parse(JSON.stringify(runtimeData.user.resources||{})),
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

        for (var i in runtimeData.rooms) {
            register.byRoom[i] = {};
            populateRegister(register.byRoom[i], true);
        }

        require('./rooms').make(runtimeData, intents, register, globals);
        require('./rooms').makePos(register, globals);
        require('./creeps').make(runtimeData, intents, register, globals);
        require('./structures').make(runtimeData, intents, register, globals);
        require('./sources').make(runtimeData, intents, register, globals);
        require('./minerals').make(runtimeData, intents, register, globals);
        require('./deposits').make(runtimeData, intents, register, globals);
        require('./nukes').make(runtimeData, intents, register, globals);
        require('./resources').make(runtimeData, intents, register, globals);
        require('./flags').make(runtimeData, intents, register, globals);
        require('./tombstones').make(runtimeData, intents, register, globals);
        require('./construction-sites').make(runtimeData, intents, register, globals);
        require('./path-finder').make(runtimeData, intents, register, globals);
        require('./power-creeps').make(runtimeData, intents, register, globals);
        require('./ruins').make(runtimeData, intents, register, globals);
        require('./store').make(runtimeData, intents, register, globals);

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
            portal: globals.StructurePortal,
            factory: globals.StructureFactory,
            invaderCore: globals.StructureInvaderCore
        };

        var c = {};

        for(var i in runtimeData.userPowerCreeps) {
            register.powerCreeps[i] = new globals.PowerCreep(i);
            game.powerCreeps[register.powerCreeps[i].name] = register.powerCreeps[i];
        }

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
            if (object.type == 'powerCreep') {
                if(register.powerCreeps[i]) {
                    register._objects[i] = register.powerCreeps[i];
                }
                else {
                    register._objects[i] = new globals.PowerCreep(i);
                }
                addObjectToRegister(register, 'powerCreeps', register._objects[i], object);
                addObjectToFindCache(register, C.FIND_POWER_CREEPS, register.powerCreeps[i], object);
                addObjectToFindCache(register, C.FIND_MY_POWER_CREEPS, register.powerCreeps[i], object);
                addObjectToFindCache(register, C.FIND_HOSTILE_POWER_CREEPS, register.powerCreeps[i], object);
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
                register.rooms[object.room].energyAvailable += object.store.energy;
                register.rooms[object.room].energyCapacityAvailable += object.storeCapacityResource.energy;
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
            if(object.type == 'deposit') {
                register._objects[i] = new globals.Deposit(i);
                addObjectToRegister(register, 'deposits', register._objects[i], object)
                addObjectToFindCache(register, C.FIND_DEPOSITS, register.deposits[i], object)
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
            if(object.type == 'ruin') {
                register._objects[i] = new globals.Ruin(i);
                addObjectToRegister(register, 'ruins', register._objects[i], object);
                addObjectToFindCache(register, C.FIND_RUINS, register._objects[i], object)
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

        game.map = register.map = map.makeMap(runtimeData, register, globals);

        game.market = register.market = market.make(runtimeData, intents, register);

        _.extend(globals, JSON.parse(JSON.stringify(C)));

        return game;
    };

    (function() {

        var runCodeCache = {};

        exports.init = function (
            _globals, _codeModules, _runtimeData,
            _intents, _memory,
            _fakeConsole, _consoleCommands,
            _timeout, _getUsedCpu,
            _scriptCachedData, _sandboxedFunctionWrapper,
            _getHeapStatistics, _cpuHalt
        ) {

            var userId = _runtimeData.user._id;

            runCodeCache[userId] = runCodeCache[userId] || {};
            runCodeCache[userId].globals = _globals;
            runCodeCache[userId].codeModules = _codeModules;
            runCodeCache[userId].runtimeData = _runtimeData;
            runCodeCache[userId].intents = _intents;
            runCodeCache[userId].memory = _memory;
            runCodeCache[userId].fakeConsole = _fakeConsole;
            runCodeCache[userId].consoleCommands = _consoleCommands;
            runCodeCache[userId].timeout = _timeout;
            runCodeCache[userId].getUsedCpu = _getUsedCpu;
            runCodeCache[userId].scriptCachedData = _scriptCachedData;
            runCodeCache[userId].getHeapStatistics = _getHeapStatistics;
            runCodeCache[userId].cpuHalt = _cpuHalt;
            runCodeCache[userId].sandboxedFunctionWrapper = _sandboxedFunctionWrapper;

            _.extend(runCodeCache[userId].globals, {
                RawMemory: runCodeCache[userId].memory,
                console: runCodeCache[userId].fakeConsole
            });

            if (!runCodeCache[userId].globals._) {
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
                    catch (e) {
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

            runCodeCache[userId].globals.Game = makeGameObject(runCodeCache[userId]);

            if (!runCodeCache[userId].globals.require ||
                runCodeCache[userId].runtimeData.userCodeTimestamp != runCodeCache[userId].globals.require.timestamp ||
                !_.isObject(runCodeCache[userId].globals.require.cache.main) || !_.isFunction(
                    runCodeCache[userId].globals.require.cache.main.loop)) {

                runCodeCache[userId].globals.require = requireFn.bind(runCodeCache[userId]);
                runCodeCache[userId].globals.require.cache = {lodash: runCodeCache[userId].globals._};
                runCodeCache[userId].globals.require.timestamp = runCodeCache[userId].runtimeData.userCodeTimestamp;
            }

            return runCodeCache[userId];
        };

        exports.run = function(userId) {

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
