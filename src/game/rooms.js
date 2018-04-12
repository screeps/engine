var _ = require('lodash'),
    utils = require('./../utils'),
    driver = utils.getRuntimeDriver(),
    C = driver.constants,
    pathfinding = require('@screeps/pathfinding');

var abs = Math.abs, min = Math.min, max = Math.max;

var runtimeData, intents, register, globals;

var positionsSetCacheCounter, createdFlagNames, createdSpawnNames, privateStore, createdConstructionSites;

let TerrainConstructor    = null;
let TerrainConstructorSet = null;

function getPathfinder(id, opts) {
    opts = opts || {};
    _.defaults(opts, {maxOps: 2000, heuristicWeight: 1});
    var key = `${opts.maxOps},${opts.heuristicWeight}`;

    if(!privateStore[id].pfFinders[key]) {
        privateStore[id].pfFinders[key] = new pathfinding.AStarFinder({
            diagonalMovement: 1,
            maxOpsLimit: opts.maxOps,
            heuristic: pathfinding.Heuristic.chebyshev,
            weight: opts.heuristicWeight
        });
    }
    return privateStore[id].pfFinders[key];
}

function makePathfindingGrid(id, opts, endNodesKey) {

    opts = opts || {};

    var rows = new Array(50),
    obstacleTypes = _.clone(C.OBSTACLE_OBJECT_TYPES);

    if(opts.ignoreDestructibleStructures) {
        obstacleTypes = _.without(obstacleTypes, 'constructedWall','spawn','extension', 'link','storage','observer','tower','powerBank','powerSpawn','lab','terminal');
    }
    if(opts.ignoreCreeps) {
        obstacleTypes = _.without(obstacleTypes, 'creep');
    }

    for(var y=0; y<50; y++) {
        rows[y] = new Array(50);
        for(var x=0; x<50; x++) {
            rows[y][x] = x == 0 || y == 0 || x == 49 || y == 49 ? 11 : 2;
            //var terrainCode = register.terrainByRoom.spatial[id][y][x];
            var terrainCode = runtimeData.staticTerrainData[id][y*50+x];
            if(terrainCode & C.TERRAIN_MASK_WALL) {
                rows[y][x] = 0;
            }
            if ((terrainCode & C.TERRAIN_MASK_SWAMP) && rows[y][x] == 2) {
                rows[y][x] = 10;
            }
        }
    }

    register.objectsByRoomKeys[id].forEach((key) => {
        var object = register.objectsByRoom[id][key];

        if (_.contains(obstacleTypes, object.type) ||
        !opts.ignoreDestructibleStructures && object.type == 'rampart' && !object.isPublic && object.user != runtimeData.user._id ||
        !opts.ignoreDestructibleStructures && object.type == 'constructionSite' && object.user == runtimeData.user._id && _.contains(C.OBSTACLE_OBJECT_TYPES, object.structureType)) {

            rows[object.y][object.x] = 0;
        }

        if (object.type == 'road' && rows[object.y][object.x] > 0) {
            rows[object.y][object.x] = 1;
        }
    });


    if(opts.ignore) {
        if(!_.isArray(opts.ignore)) {
            throw new Error('option `ignore` is not an array');
        }
        _.forEach(opts.ignore, (i, key) => {
            if(!i) {
                return;
            }
            if(i.pos) {
                rows[i.pos.y][i.pos.x] = rows[i.pos.y][i.pos.x] > 2 ? 2 : rows[i.pos.y][i.pos.x];
            }
            if(_.isObject(i) && !_.isUndefined(i.x) && !(i instanceof globals.RoomPosition)) {
                opts.ignore[key] = new globals.RoomPosition(i.x, i.y, id);
            }
            if(!_.isUndefined(i.x)) {
                rows[i.y][i.x] = rows[i.y][i.x] > 2 ? 2 : rows[i.y][i.x];
            }
        });
    }

    if(opts.avoid) {
        if(!_.isArray(opts.avoid)) {
            throw new Error('option `avoid` is not an array');
        }
        _.forEach(opts.avoid, (i, key) => {
            if(!i) {
                return;
            }
            if(i.pos) {
                rows[i.pos.y][i.pos.x] = 0;
            }
            if(_.isObject(i) && !_.isUndefined(i.x) && !(i instanceof globals.RoomPosition)) {
                opts.avoid[key] = new globals.RoomPosition(i.x, i.y, id);
            }
            if(!_.isUndefined(i.x)) {
                rows[i.y][i.x] = 0;
            }
        });
    }
    if(endNodesKey) {
        _.forEach(privateStore[id].pfEndNodes[endNodesKey], (i) => {
            if(!_.isUndefined(i.x)) {
                rows[i.y][i.x] = 999;
            }
            else if(!_.isUndefined(i.pos)) {
                rows[i.pos.y][i.pos.x] = 999;
            }
        });
    }

    return new pathfinding.Grid(50, 50, rows);
}

function getPathfindingGrid(id, opts, endNodesKey) {

    var gridName = 'grid';

    opts = opts || {};

    if(opts.ignoreCreeps) {
        gridName += '_ignoreCreeps'
    }
    if(opts.ignoreDestructibleStructures) {
        gridName += '_ignoreDestructibleStructures'
    }
    if(_.isNumber(endNodesKey)) {
        gridName += '_endNodes'+endNodesKey;
    }
    if(opts.avoid) {
        gridName += '_avoid'+privateStore[id].positionsSetCache.key(opts.avoid);
    }
    if(opts.ignore) {
        gridName += '_ignore'+privateStore[id].positionsSetCache.key(opts.ignore);
    }

    if(!privateStore[id].pfGrid[gridName]) privateStore[id].pfGrid[gridName] = makePathfindingGrid(id, opts, endNodesKey);

    return privateStore[id].pfGrid[gridName].clone();
}

function makePathfindingGrid2(id, opts) {

    opts = opts || {};

    var costs = new globals.PathFinder.CostMatrix();

    var obstacleTypes = _.clone(C.OBSTACLE_OBJECT_TYPES);
    obstacleTypes.push('portal');

    if(opts.ignoreDestructibleStructures) {
        obstacleTypes = _.without(obstacleTypes, 'constructedWall','spawn','extension', 'link','storage','observer','tower','powerBank','powerSpawn','lab','terminal');
    }
    if(opts.ignoreCreeps || register.rooms[id].controller && register.rooms[id].controller.safeMode && register.rooms[id].controller.my) {
        obstacleTypes = _.without(obstacleTypes, 'creep');
    }

    if(register.objectsByRoomKeys[id]) {
        register.objectsByRoomKeys[id].forEach((key) => {
            var object = register.objectsByRoom[id][key];

            if (_.contains(obstacleTypes, object.type) ||
            !opts.ignoreCreeps && register.rooms[id].controller && register.rooms[id].controller.safeMode && register.rooms[id].controller.my && object.type == 'creep' && object.user == runtimeData.user._id ||
            !opts.ignoreDestructibleStructures && object.type == 'rampart' && !object.isPublic && object.user != runtimeData.user._id ||
            !opts.ignoreDestructibleStructures && object.type == 'constructionSite' && object.user == runtimeData.user._id && _.contains(C.OBSTACLE_OBJECT_TYPES, object.structureType)) {

                costs.set(object.x, object.y, 0xFF);
            }

            if (object.type == 'swamp' && costs.get(object.x, object.y) == 0) {
                costs.set(object.x, object.y, opts.ignoreRoads ? 5 : 10);
            }

            if (!opts.ignoreRoads && object.type == 'road' && costs.get(object.x, object.y) < 0xFF) {
                costs.set(object.x, object.y, 1);
            }
        });
    }

    return costs;
}

function getPathfindingGrid2(id, opts) {

    if(!privateStore[id]) {
        return new globals.PathFinder.CostMatrix();
    }

    var gridName = 'grid2';

    opts = opts || {};

    if(opts.ignoreCreeps) {
        gridName += '_ignoreCreeps';
    }
    if(opts.ignoreDestructibleStructures) {
        gridName += '_ignoreDestructibleStructures';
    }
    if(opts.ignoreRoads) {
        gridName += '_ignoreRoads';
    }

    if(!privateStore[id].pfGrid[gridName]) privateStore[id].pfGrid[gridName] = makePathfindingGrid2(id, opts);

    return privateStore[id].pfGrid[gridName];
}

function _findPath2(id, fromPos, toPos, opts) {

    opts = opts || {};

    if(fromPos.isEqualTo(toPos)) {
        return opts.serialize ? '' : [];
    }

    if(opts.avoid) {
        register.deprecated('`avoid` option cannot be used when `PathFinder.use()` is enabled. Use `costCallback` instead.');
        opts.avoid = undefined;
    }
    if(opts.ignore) {
        register.deprecated('`ignore` option cannot be used when `PathFinder.use()` is enabled. Use `costCallback` instead.');
        opts.ignore = undefined;
    }
    if(opts.maxOps === undefined && (opts.maxRooms === undefined || opts.maxRooms > 1) && fromPos.roomName != toPos.roomName) {
        opts.maxOps = 20000;
    }
    var searchOpts = {
        roomCallback: function(roomName) {
            var costMatrix = getPathfindingGrid2(roomName, opts);
            if(typeof opts.costCallback == 'function') {
                costMatrix = costMatrix.clone();
                var resultMatrix = opts.costCallback(roomName, costMatrix);
                if(resultMatrix instanceof globals.PathFinder.CostMatrix) {
                    costMatrix = resultMatrix;
                }
            }
            return costMatrix;
        },
        maxOps: opts.maxOps,
        maxRooms: opts.maxRooms
    };
    if(!opts.ignoreRoads) {
        searchOpts.plainCost = 2;
        searchOpts.swampCost = 10;
    }
    if(opts.plainCost) {
        searchOpts.plainCost = opts.plainCost;
    }
    if(opts.swampCost) {
        searchOpts.swampCost = opts.swampCost;
    }

    var ret = globals.PathFinder.search(fromPos, {range: Math.max(1,opts.range || 0), pos: toPos}, searchOpts);

    if(!opts.range &&
            (ret.path.length && ret.path[ret.path.length-1].isNearTo(toPos) && !ret.path[ret.path.length-1].isEqualTo(toPos) ||
            !ret.path.length && fromPos.isNearTo(toPos))) {
        ret.path.push(toPos);
    }
    var curX = fromPos.x, curY = fromPos.y;

    var resultPath = [];

    for(let i=0; i<ret.path.length; i++) {
        let pos = ret.path[i];
        if(pos.roomName != id) {
            break;
        }
        let result = {
            x: pos.x,
            y: pos.y,
            dx: pos.x - curX,
            dy: pos.y - curY,
            direction: utils.getDirection(pos.x - curX, pos.y - curY)
        };

        curX = result.x;
        curY = result.y;
        resultPath.push(result);
    }

    if(opts.serialize) {
        return utils.serializePath(resultPath);
    }

    return resultPath;
}

function _findClosestByPath2(fromPos, objects, opts) {

    opts = opts || {};

    if(_.isNumber(objects)) {
        objects = register.rooms[fromPos.roomName].find(objects, {filter: opts.filter});
    }
    else if(opts.filter) {
        objects = _.filter(objects, opts.filter);
    }

    if(!objects.length) {
        return null;
    }

    var objectOnSquare = _.find(objects, obj => fromPos.isEqualTo(obj));
    if(objectOnSquare) {
        return objectOnSquare;
    }

    var goals = _.map(objects, i => {
        if(i.pos) {
            i = i.pos;
        }
        return {range: 1, pos: i};
    });

    if(opts.avoid) {
        register.deprecated('`avoid` option cannot be used when `PathFinder.use()` is enabled. Use `costCallback` instead.');
    }
    if(opts.ignore) {
        register.deprecated('`ignore` option cannot be used when `PathFinder.use()` is enabled. Use `costCallback` instead.');
    }
    var searchOpts = {
        roomCallback: function(roomName) {
            if(register.objectsByRoom[roomName]) {
                var costMatrix = getPathfindingGrid2(roomName, opts);
                if(typeof opts.costCallback == 'function') {
                    costMatrix = costMatrix.clone();
                    var resultMatrix = opts.costCallback(roomName, costMatrix);
                    if(resultMatrix instanceof globals.PathFinder.CostMatrix) {
                        costMatrix = resultMatrix;
                    }
                }
                return costMatrix;
            }
        },
        maxOps: opts.maxOps,
        maxRooms: 1
    };
    if(!opts.ignoreRoads) {
        searchOpts.plainCost = 2;
        searchOpts.swampCost = 10;
    }
    var ret = globals.PathFinder.search(fromPos, goals, searchOpts);

    var result = null;
    var lastPos = fromPos;

    if(ret.path.length) {
        lastPos = ret.path[ret.path.length-1];
    }

    objects.forEach(obj => {
        if(lastPos.isNearTo(obj)) {
            result = obj;
        }
    });

    return result;
}

exports.make = function(_runtimeData, _intents, _register, _globals) {

    runtimeData = _runtimeData;
    intents = _intents;
    register = _register;
    globals = _globals;

    positionsSetCacheCounter = 1;
    createdFlagNames = [];
    createdSpawnNames = [];
    privateStore = {};
    createdConstructionSites = 0;
    
    TerrainConstructor || (()=>{
        for(var roomName in runtimeData.staticTerrainData) {
            var array = runtimeData.staticTerrainData[roomName];
            TerrainConstructor = array.constructor;
            break;
        }
    })();
    
    TerrainConstructorSet || (()=>{
        TerrainConstructorSet = TerrainConstructor.prototype.set;
    })();
    
    if(globals.Room) {
        return;
    }

    var data = (id) => {
        if(!runtimeData.rooms[id]) {
            throw new Error("Could not find a room with name "+id);
        }
        return runtimeData.rooms[id];
    };


    /**
     * Room
     * @param id
     * @returns {number}
     * @constructor
     */
    var Room = register.wrapFn(function(id) {

        var objectData = data(id);

        var gameInfo, gameId = id, match = id.match(/survival_(.*)$/);
        if(match) {
            gameId = match[1];
        }
        if(runtimeData.games && gameId in runtimeData.games) {
            gameInfo = runtimeData.games[gameId];
        }

        this.name = id;

        this.energyAvailable = 0;
        this.energyCapacityAvailable = 0;

        this.survivalInfo = gameInfo;

        privateStore[id] = {
            pfGrid: {},
            pfFinders: {},
            pfEndNodes: {},
            pfDijkstraFinder: new pathfinding.DijkstraFinder({diagonalMovement: 1}),
            pathCache: {},
            positionsSetCache: {

                cache: {},

                key(array) {

                    if (!_.isArray(array)) {
                        return 0;
                    }

                    var positionsArray = _.map(array, (i) => {
                        if (i && i.pos) {
                            return i.pos;
                        }
                        if(_.isObject(i) && !_.isUndefined(i.x) && !(i instanceof globals.RoomPosition)) {
                            return new globals.RoomPosition(i.x, i.y, id);
                        }
                        return i;
                    });

                    var key = _.findKey(this.cache, (objects) => {
                        return positionsArray.length == objects.length && _.every(positionsArray, (j) => _.any(objects, (object) => {
                            if(!_.isObject(j) || !j.isEqualTo) {
                                throw new Error('Invalid position '+j+', check your `opts` property');
                            }
                            return j.isEqualTo(object);
                        }));
                    });

                    if (key === undefined) {
                        key = positionsSetCacheCounter++;
                        this.cache[key] = _.clone(array);
                    }
                    else {
                        key = parseInt(key);
                    }

                    return key;
                }
            },
            lookTypeRegisters: {
                creep: register.byRoom[id].creeps,
                energy: register.byRoom[id].energy,
                resource: register.byRoom[id].energy,
                source: register.byRoom[id].sources,
                mineral: register.byRoom[id].minerals,
                structure: register.byRoom[id].structures,
                flag: register.byRoom[id].flags,
                constructionSite: register.byRoom[id].constructionSites,
                tombstone: register.byRoom[id].tombstones,
                nuke: register.byRoom[id].nukes
            },
            lookTypeSpatialRegisters: {
                creep: register.byRoom[id].spatial.creeps,
                energy: register.byRoom[id].spatial.energy,
                resource: register.byRoom[id].spatial.energy,
                source: register.byRoom[id].spatial.sources,
                mineral: register.byRoom[id].spatial.minerals,
                structure: register.byRoom[id].spatial.structures,
                flag: register.byRoom[id].spatial.flags,
                constructionSite: register.byRoom[id].spatial.constructionSites,
                tombstone: register.byRoom[id].spatial.tombstones,
                nuke: register.byRoom[id].spatial.nukes
            }
        };

        this.visual = new globals.RoomVisual(id);
    });

    Room.serializePath = register.wrapFn(function(path) {
        return utils.serializePath(path);
    });

    Room.deserializePath = register.wrapFn(function(str) {
        return utils.deserializePath(str);
    });

    Room.prototype.toString = register.wrapFn(function() {
        return `[room ${this.name}]`;
    });

    Room.prototype.toJSON = register.wrapFn(function() {
        var result = {};
        for(var i in this) {
            if(i[0] == '_' || _.contains(['toJSON','toString','controller','storage','terminal'],i)) {
                continue;
            }
            result[i] = this[i];
        }
        return result;
    });

    Object.defineProperty(Room.prototype, 'memory', {
        get: function() {
            if(_.isUndefined(globals.Memory.rooms) || globals.Memory.rooms === 'undefined') {
                globals.Memory.rooms = {};
            }
            if(!_.isObject(globals.Memory.rooms)) {
                return undefined;
            }
            return globals.Memory.rooms[this.name] = globals.Memory.rooms[this.name] || {};
        },

        set: function(value) {
            if(_.isUndefined(globals.Memory.rooms) || globals.Memory.rooms === 'undefined') {
                globals.Memory.rooms = {};
            }
            if(!_.isObject(globals.Memory.rooms)) {
                throw new Error('Could not set room memory');
            }
            globals.Memory.rooms[this.name] = value;
        }
    });

    Room.prototype.getEventLog = register.wrapFn(function(raw) {
        if(raw) {
            return runtimeData.roomEventLog[this.name] || '[]';
        }
        let {roomEventLogCache} = register;
        if(!roomEventLogCache[this.name]) {
            roomEventLogCache[this.name] = JSON.parse(runtimeData.roomEventLog[this.name] || '[]');
        }
        return roomEventLogCache[this.name];
    });

    Room.prototype.find = register.wrapFn(function(type, opts) {
        var result = [];
        opts = opts || {};
        if(type === C.FIND_DROPPED_ENERGY) {
            register.deprecated('FIND_DROPPED_ENERGY constant is considered deprecated and will be removed soon. Please use FIND_DROPPED_RESOURCES instead.');
            type = C.FIND_DROPPED_RESOURCES;
        }
        if(register.findCache[type] && register.findCache[type][this.name]) {
            result = register.findCache[type][this.name];
        }
        else {
            switch (type) {
                case C.FIND_EXIT:
                    register.findCache[type] = register.findCache[type] || {};
                    register.findCache[type][this.name] = this.find(C.FIND_EXIT_TOP, opts)
                    .concat(this.find(C.FIND_EXIT_BOTTOM, opts))
                    .concat(this.find(C.FIND_EXIT_RIGHT, opts))
                    .concat(this.find(C.FIND_EXIT_LEFT, opts));
                    return _.clone(register.findCache[type][this.name]);
                case C.FIND_EXIT_TOP:
                case C.FIND_EXIT_RIGHT:
                case C.FIND_EXIT_BOTTOM:
                case C.FIND_EXIT_LEFT:

                    register.findCache[type] = register.findCache[type] || {};

                    var exits = [];
                    for (var i = 0; i < 50; i++) {
                        var x=0,y=0;
                        if(type == C.FIND_EXIT_LEFT || type == C.FIND_EXIT_RIGHT) {
                            y = i;
                        }
                        else  {
                            x = i;
                        }
                        if(type == C.FIND_EXIT_RIGHT) {
                            x = 49;
                        }
                        if(type == C.FIND_EXIT_BOTTOM) {
                            y = 49;
                        }
                        exits.push(!(runtimeData.staticTerrainData[this.name][y*50+x] & C.TERRAIN_MASK_WALL));
                    }

                    result = _.reduce(exits, (accum, i, key) => {
                        if (i) {
                            if (type == C.FIND_EXIT_TOP) {
                                accum.push(this.getPositionAt(key, 0));
                            }
                            if (type == C.FIND_EXIT_BOTTOM) {
                                accum.push(this.getPositionAt(key, 49));
                            }
                            if (type == C.FIND_EXIT_LEFT) {
                                accum.push(this.getPositionAt(0, key));
                            }
                            if (type == C.FIND_EXIT_RIGHT) {
                                accum.push(this.getPositionAt(49, key));
                            }
                        }
                        return accum;
                    }, []);

                    register.findCache[type][this.name] = result;

                    break;
            }
        }

        if(opts.filter) {
            result = _.filter(result, opts.filter);
        }
        else {
            result = _.clone(result);
        }

        return result;

    });

    function _lookSpatialRegister (id, typeName, x,y, outArray, withCoords) {

        var item;

        if(typeName == 'terrain') {
            var result = 'plain';
            var terrainCode = runtimeData.staticTerrainData[id][y*50+x];
            if(terrainCode & C.TERRAIN_MASK_SWAMP) {
                result = 'swamp';
            }
            if(terrainCode & C.TERRAIN_MASK_WALL) {
                result = 'wall';
            }
            if(outArray) {
                item = {type: 'terrain', terrain: result};
                if(withCoords) {
                    item.x = x;
                    item.y = y;
                }
                outArray.push(item);
                return;
            }
            return [result];
        }

        if(x < 0 || y < 0 || x > 49 || y > 49) {
            throw new Error('look coords are out of bounds');
        }

        var typeResult = privateStore[id].lookTypeSpatialRegisters[typeName][x * 50 + y];
        if(typeResult) {
            if(outArray) {
                typeResult.forEach((i) => {
                    item = {type: typeName};
                    item[typeName] = i;
                    if(withCoords) {
                        item.x = x;
                        item.y = y;
                    }
                    outArray.push(item);
                });
                return;
            }
            return _.clone(typeResult);
        }
        return [];
    }

    function _lookAreaMixedRegister(id, type, top, left, bottom, right, withType, asArray, result) {
        var typeRegister = privateStore[id].lookTypeRegisters[type],
        keys = typeRegister && Object.keys(typeRegister);

        if(type != 'terrain' && keys.length < (bottom-top+1)*(right-left+1)) {

            // by objects

            var checkInside = (i) => {
                return (!i.pos && i.roomName == id || i.pos && i.pos.roomName == id) &&
                i.pos && i.pos.y >= top && i.pos.y <= bottom && i.pos.x >= left && i.pos.x <= right ||
                !i.pos && i.y >= top && i.y <= bottom && i.x >= left && i.x <= right;
            };
            var item;
            keys.forEach((key) => {
                var obj = typeRegister[key];
                if(checkInside(obj)) {
                    if(withType) {
                        item = {type: type};
                        item[type] = obj;
                        if(asArray) {
                            result.push({x: obj.x || obj.pos.x, y: obj.y || obj.pos.y, type, [type]: obj});
                        }
                        else {
                            result[obj.y || obj.pos.y][obj.x || obj.pos.x].push(item);
                        }
                    }
                    else {
                        if(asArray) {
                            result.push({x: obj.x || obj.pos.x, y: obj.y || obj.pos.y, [type]: obj});
                        }
                        else {
                            result[obj.y || obj.pos.y][obj.x || obj.pos.x] = result[obj.y || obj.pos.y][obj.x || obj.pos.x] || [];
                            result[obj.y || obj.pos.y][obj.x || obj.pos.x].push(obj);
                        }
                    }
                }
            });
        }
        else {

            // spatial

            for (var y = top; y <= bottom; y++) {
                for (var x = left; x <= right; x++) {
                    if(asArray) {
                        _lookSpatialRegister(id, type, x, y, result, true);
                    }
                    else {
                        if (result[y][x]) {
                            _lookSpatialRegister(id, type, x, y, result[y][x]);
                        }
                        else {
                            result[y][x] = _lookSpatialRegister(id, type, x, y, undefined);
                        }
                    }
                }
            }
        }
    }

    Room.prototype.lookAt = register.wrapFn(function(firstArg, secondArg) {
        var [x,y] = utils.fetchXYArguments(firstArg, secondArg, globals),
            result = [];

        _lookSpatialRegister(this.name, C.LOOK_CREEPS, x,y, result);
        _lookSpatialRegister(this.name, C.LOOK_ENERGY, x,y, result);
        _lookSpatialRegister(this.name, C.LOOK_RESOURCES, x,y, result);
        _lookSpatialRegister(this.name, C.LOOK_SOURCES, x,y, result);
        _lookSpatialRegister(this.name, C.LOOK_MINERALS, x,y, result);
        _lookSpatialRegister(this.name, C.LOOK_STRUCTURES, x,y, result);
        _lookSpatialRegister(this.name, C.LOOK_FLAGS, x,y, result);
        _lookSpatialRegister(this.name, C.LOOK_CONSTRUCTION_SITES, x,y, result);
        _lookSpatialRegister(this.name, C.LOOK_TERRAIN, x,y, result);
        _lookSpatialRegister(this.name, C.LOOK_NUKES, x,y, result);
        _lookSpatialRegister(this.name, C.LOOK_TOMBSTONES, x,y, result);

        return result;
    });

    Room.prototype.lookForAt = register.wrapFn(function(type, firstArg, secondArg) {
        var [x,y] = utils.fetchXYArguments(firstArg, secondArg, globals);

        if(type != 'terrain' && !(type in privateStore[this.name].lookTypeSpatialRegisters)) {
            return C.ERR_INVALID_ARGS;
        }

        return _lookSpatialRegister(this.name, type, x,y);
    });

    Room.prototype.lookAtArea = register.wrapFn(function(top, left, bottom, right, asArray) {

        var result = asArray ? [] : {};

        if(!asArray) {
            for (var y = top; y <= bottom; y++) {
                result[y] = {};
                for (var x = left; x <= right; x++) {
                    result[y][x] = [];
                }
            }
        }

        _lookAreaMixedRegister(this.name, C.LOOK_CREEPS, top, left, bottom, right, true, asArray, result);
        _lookAreaMixedRegister(this.name, C.LOOK_ENERGY, top, left, bottom, right, true, asArray, result);
        _lookAreaMixedRegister(this.name, C.LOOK_RESOURCES, top, left, bottom, right, true, asArray, result);
        _lookAreaMixedRegister(this.name, C.LOOK_SOURCES, top, left, bottom, right, true, asArray, result);
        _lookAreaMixedRegister(this.name, C.LOOK_MINERALS, top, left, bottom, right, true, asArray, result);
        _lookAreaMixedRegister(this.name, C.LOOK_STRUCTURES, top, left, bottom, right, true, asArray, result);
        _lookAreaMixedRegister(this.name, C.LOOK_FLAGS, top, left, bottom, right, true, asArray, result);
        _lookAreaMixedRegister(this.name, C.LOOK_CONSTRUCTION_SITES, top, left, bottom, right, true, asArray, result);
        _lookAreaMixedRegister(this.name, C.LOOK_TERRAIN, top, left, bottom, right, true, asArray, result);
        _lookAreaMixedRegister(this.name, C.LOOK_NUKES, top, left, bottom, right, true, asArray, result);
        _lookAreaMixedRegister(this.name, C.LOOK_TOMBSTONES, top, left, bottom, right, true, asArray, result);

        return result;
    });

    Room.prototype.lookForAtArea = register.wrapFn(function(type, top, left, bottom, right, asArray) {

        var result = asArray ? [] : {};

        if(!asArray) {
            for (var y = top; y <= bottom; y++) {
                result[y] = {};
            }
        }

        _lookAreaMixedRegister(this.name, type, top, left, bottom, right, false, asArray, result);

        return result;
    });


    Room.prototype.findPath = register.wrapFn(function(fromPos, toPos, opts) {

        if(fromPos.roomName != this.name) {
            return opts.serialize ? '' : [];
        }

        if(register._useNewPathFinder) {
            return _findPath2(this.name, fromPos, toPos, opts);
        }

        var fromX = fromPos.x, fromY = fromPos.y,
            path,
            cacheKeySuffix = '';

        opts = _.clone(opts || {});

        if(opts.ignoreCreeps) {
            cacheKeySuffix += '_ignoreCreeps'
        }
        if(opts.ignoreDestructibleStructures) {
            cacheKeySuffix += '_ignoreDestructibleStructures'
        }
        if(opts.avoid) {
            cacheKeySuffix += '_avoid'+privateStore[this.name].positionsSetCache.key(opts.avoid);
        }
        if(opts.ignore) {
            cacheKeySuffix += '_ignore'+privateStore[this.name].positionsSetCache.key(opts.ignore);
        }

        if(_.isNumber(toPos)) {
            if(!privateStore[this.name].pfEndNodes[toPos]) {
                return opts.serialize ? '' : [];
            }

            var grid = getPathfindingGrid(this.name, opts, toPos);

            path = privateStore[this.name].pfDijkstraFinder.findPath(fromX, fromY, -999, -999, grid);
        }
        else {

            if(toPos.roomName != this.name) {
                return opts.serialize ? '' : [];
            }

            var toX = toPos.x, toY = toPos.y,
                cacheKey = `${fromX},${fromY},${toX},${toY}${cacheKeySuffix}`;

            if(privateStore[this.name].pathCache[cacheKey]) {
                return opts.serialize ? utils.serializePath(privateStore[this.name].pathCache[cacheKey]) : _.cloneDeep(privateStore[this.name].pathCache[cacheKey]);
            }

            if (fromX == toX && fromY == toY) {
                return opts.serialize ? '' : [];
            }
            if (fromX < 0 || fromY < 0 || toX < 0 || toY < 0 ||
                fromX >= 50 || fromY >= 50 || toX >= 50 || toY >= 50) {
                return opts.serialize ? '' : [];
            }

            if (abs(fromX - toX) < 2 && abs(fromY - toY) < 2) {
                var result = [{
                    x: toX,
                    y: toY,
                    dx: toX - fromX,
                    dy: toY - fromY,
                    direction: utils.getDirection(toX - fromX, toY - fromY)
                }];
                return opts.serialize ? utils.serializePath(result) : result;
            }

            var grid = getPathfindingGrid(this.name, opts),
                finder = getPathfinder(this.name, opts);

            grid.setWalkableAt(toX, toY, true);
            path = finder.findPath(fromX, fromY, toX, toY, grid);
        }

        path.splice(0,1);

        var curX = fromX, curY = fromY;

        var resultPath = _.map(path, (step) => {
            var result = {
                x: step[0],
                y: step[1],
                dx: step[0] - curX,
                dy: step[1] - curY,
                direction: utils.getDirection(step[0] - curX, step[1] - curY)
            };

            curX = result.x;
            curY = result.y;
            return result;
        });

        if(resultPath.length > 0) {
            var lastStep = resultPath[resultPath.length-1],
                cacheKey = `${fromX},${fromY},${lastStep.x},${lastStep.y}${cacheKeySuffix}`;
            privateStore[this.name].pathCache[cacheKey] = _.cloneDeep(resultPath);
        }

        if(opts.serialize) {
            return utils.serializePath(resultPath);
        }

        return resultPath;
    });

    Room.prototype.getPositionAt = register.wrapFn(function(x,y) {
        if(x < 0 || x > 49 || y < 0 || y > 49) {
            return null;
        }
        return new globals.RoomPosition(x,y,this.name);
    });

    Room.prototype.createFlag = register.wrapFn(function(firstArg, secondArg, name, color, secondaryColor) {
        var [x,y] = utils.fetchXYArguments(firstArg, secondArg, globals);

        if(_.isUndefined(x) || _.isUndefined(y) || x < 0 || x > 49 || y < 0 || y > 49) {
            return C.ERR_INVALID_ARGS;
        }
        if(_.size(globals.Game.flags) >= C.FLAGS_LIMIT) {
            return C.ERR_FULL;
        }
        if(_.isObject(firstArg)) {
            secondaryColor = color;
            color = name;
            name = secondArg;
        }
        if(!color) {
            color = C.COLOR_WHITE;
        }
        if(!secondaryColor) {
            secondaryColor = color;
        }
        if(!_.contains(C.COLORS_ALL, color)) {
            return C.ERR_INVALID_ARGS;
        }
        if(!_.contains(C.COLORS_ALL, secondaryColor)) {
            return C.ERR_INVALID_ARGS;
        }
        if(!name) {
            var cnt = 1;
            do {
                name = 'Flag'+cnt;
                cnt++;
            }
            while(_.any(register.flags, {name}) || createdFlagNames.indexOf(name) != -1);
        }
        if(_.any(register.flags, {name}) || createdFlagNames.indexOf(name) != -1) {
            return C.ERR_NAME_EXISTS;
        }
        if(name.length > 60) {
            return C.ERR_INVALID_ARGS;
        }

        createdFlagNames.push(name);

        globals.Game.flags[name] = new globals.Flag(name, color, secondaryColor, this.name, x, y);

        intents.pushByName('room', 'createFlag', {roomName: this.name, x, y, name, color, secondaryColor});

        return name;
    });

    Room.prototype.createConstructionSite = register.wrapFn(function(firstArg, secondArg, structureType, name) {
        var [x,y] = utils.fetchXYArguments(firstArg, secondArg, globals);

        if(_.isUndefined(x) || _.isUndefined(y) || x < 0 || x > 49 || y < 0 || y > 49) {
            return C.ERR_INVALID_ARGS;
        }
        if(_.isString(secondArg) && _.isUndefined(structureType)) {
            structureType = secondArg;
        }
        if(!C.CONSTRUCTION_COST[structureType]) {
            return C.ERR_INVALID_ARGS;
        }
        if(structureType == 'spawn' && typeof name == 'string') {
            if(createdSpawnNames.indexOf(name) != -1) {
                return C.ERR_INVALID_ARGS;
            }
            if(_.any(register.spawns, {name}) || _.any(register.constructionSites, {structureType: 'spawn', name})) {
                return C.ERR_INVALID_ARGS;
            }
        }
        if(this.controller && this.controller.level > 0 && !this.controller.my) {
            return C.ERR_RCL_NOT_ENOUGH;
        }
        if(!utils.checkControllerAvailability(structureType, register.objectsByRoom[this.name], this.controller)) {
            return C.ERR_RCL_NOT_ENOUGH;
        }
        if(!utils.checkConstructionSite(register.objectsByRoom[this.name], structureType, x, y) ||
            !utils.checkConstructionSite(runtimeData.staticTerrainData[this.name], structureType, x, y)) {
            return C.ERR_INVALID_TARGET;
        }

        if(_(runtimeData.userObjects).filter({type: 'constructionSite'}).size() + createdConstructionSites >= C.MAX_CONSTRUCTION_SITES) {
            return C.ERR_FULL;
        }

        var intent = {roomName: this.name, x, y, structureType};

        if(structureType == 'spawn') {
            if(typeof name !== 'string') {
                var cnt = 1;
                do {
                    name = "Spawn" + cnt;
                    cnt++;
                }
                while (_.any(register.spawns, {name}) ||
                _.any(register.constructionSites, {structureType: 'spawn', name}) ||
                createdSpawnNames.indexOf(name) != -1);
            }
            createdSpawnNames.push(name);
            intent.name = name;
        }

        createdConstructionSites++;

        intents.pushByName('room', 'createConstructionSite', intent);

        return C.OK;
    });

    Room.prototype.getEndNodes = register.wrapFn(function(type, opts) {
        var key;

        opts = opts || {};

        if(_.isUndefined(type)) {
            throw new Error('Find type cannot be undefined');
        }

        if(!opts.filter && _.isNumber(type)) {
            key = type;
        }
        else {
            if(_.isNumber(type)) {
                type = this.find(type, opts);
            }

            key = privateStore[this.name].positionsSetCache.key(type);

            privateStore[this.name].pfEndNodes[key] = privateStore[this.name].positionsSetCache.cache[key];
        }

        if(!privateStore[this.name].pfEndNodes[key]) {
            privateStore[this.name].pfEndNodes[key] = _.clone(type);
            if (_.isNumber(type)) {
                privateStore[this.name].pfEndNodes[key] = this.find(type, opts);
            }
        }
        return {key, objects: privateStore[this.name].pfEndNodes[key]};
    });

    Room.prototype.findExitTo = register.wrapFn(function(room) {
        return register.map.findExit(this.name, room);
    });

    Room.prototype.getTerrain = register.wrapFn(function() {
        return new Room.Terrain(this.name);
    });

    Object.defineProperty(globals, 'Room', {enumerable: true, value: Room});

    /**
     * RoomVisual
     * @param id
     * @returns {object}
     * @constructor
     */
    var RoomVisual = register.wrapFn(function(roomName) {
        this.roomName = roomName;
    });

    RoomVisual.prototype.circle = register.wrapFn(function(x,y,style) {
        if(typeof x == 'object') {
            style = y;
            y = x.y;
            x = x.x;
        }
        globals.console.addVisual(this.roomName, {t: 'c', x,y,s:style});
        return this;
    });

    RoomVisual.prototype.line = register.wrapFn(function(x1,y1,x2,y2,style) {
        if(typeof x1 == 'object' && typeof y1 == 'object') {
            style = x2;
            x2 = y1.x;
            y2 = y1.y;
            y1 = x1.y;
            x1 = x1.x;
        }
        globals.console.addVisual(this.roomName, {t: 'l', x1,y1,x2,y2,s:style});
        return this;
    });

    RoomVisual.prototype.rect = register.wrapFn(function(x,y,w,h,style) {
        if(typeof x == 'object') {
            style = h;
            h = w;
            w = y;
            y = x.y;
            x = x.x;
        }
        globals.console.addVisual(this.roomName, {t: 'r', x,y,w,h,s:style});
        return this;
    });

    RoomVisual.prototype.poly = register.wrapFn(function(points,style) {
        points = points.map(i => i.x !== undefined ? [i.x, i.y] : i);
        globals.console.addVisual(this.roomName, {t: 'p', points,s:style});
        return this;
    });

    RoomVisual.prototype.text = register.wrapFn(function(text,x,y,style) {
        if(typeof x == 'object') {
            style = y;
            y = x.y;
            x = x.x;
        }
        globals.console.addVisual(this.roomName, {t: 't', text,x,y,s:style});
        return this;
    });

    RoomVisual.prototype.getSize = register.wrapFn(function() {
        return globals.console.getVisualSize(this.roomName);
    });

    RoomVisual.prototype.clear = register.wrapFn(function() {
        globals.console.clearVisual(this.roomName);
        return this;
    });
    
    Object.defineProperty(globals, 'RoomVisual', {enumerable: true, value: RoomVisual});

    
    Room.Terrain = register.wrapFn(function(roomName){ "use strict";
        roomName = "" + roomName;
        
        const array = (runtimeData.staticTerrainData || {})[roomName];
        if(!array)
            throw new Error(`Could not access room ${roomName}`);
        
        this.get = register.wrapFn(function(x,y){
            const value = array[y * 50 + x];
            return (value & C.TERRAIN_MASK_WALL) || (value & C.TERRAIN_MASK_SWAMP) || 0;
        });
        
        this.getRawBuffer = register.wrapFn(function(destinationArray){
            if(!!destinationArray) {
                TerrainConstructorSet.call(destinationArray, array);
                return destinationArray;
            }
            return new TerrainConstructor(array);
        });
    });
};

exports.makePos = function(_register) {

    register = _register;

    if(globals.RoomPosition) {
        return;
    }

    /**
     * RoomPosition
     * @param x
     * @param y
     * @param roomName
     * @constructor
     */
    const kMaxWorldSize = 256;
    const kMaxWorldSize2 = kMaxWorldSize >> 1;
    const roomNames = [];
    utils.getRoomNameFromXY = function(slowFn) {
        return function(xx, yy) {
            let id = (xx + kMaxWorldSize2) << 8 | (yy + kMaxWorldSize2);
            let roomName = roomNames[id];
            if (roomName === undefined) {
                return roomNames[id] = slowFn(xx, yy);
            } else {
                return roomName;
            }
        };
    }(utils.getRoomNameFromXY);
    roomNames[0] = 'sim';

    let RoomPosition = register.wrapFn(function RoomPosition(xx, yy, roomName) {
        let xy = roomName === 'sim' ? [-kMaxWorldSize2, -kMaxWorldSize2] : utils.roomNameToXY(roomName);
        xy[0] += kMaxWorldSize2;
        xy[1] += kMaxWorldSize2;
        if (
            xy[0] < 0 || xy[0] > kMaxWorldSize || xy[0] !== xy[0] ||
            xy[1] < 0 || xy[1] > kMaxWorldSize || xy[1] !== xy[1] ||
            xx < 0 || xx > 49 || xx !== xx ||
            yy < 0 || yy > 49 || yy !== yy
        ) {
            throw new Error('Invalid arguments in RoomPosition constructor');
        }
        Object.defineProperty(this, '__packedPos', {
            enumerable: false,
            value: xy[0] << 24 | xy[1] << 16 | xx << 8 | yy,
            writable: true,
        });
    });

    Object.defineProperties(RoomPosition.prototype, {
        x: {
            enumerable: true,
            get() {
                return (this.__packedPos >> 8) & 0xff;
            },
            set(val) {
                if (val < 0 || val > 49 || val !== val) {
                    throw new Error('Invalid coordinate');
                }
                this.__packedPos = this.__packedPos & ~(0xff << 8) | val << 8;
            },
        },

        y: {
            enumerable: true,
            get() {
                return this.__packedPos & 0xff;
            },
            set(val) {
                if (val < 0 || val > 49 || val !== val) {
                    throw new Error('Invalid coordinate');
                }
                this.__packedPos = this.__packedPos & ~0xff | val << 8;
            },
        },

        roomName: {
            enumerable: true,
            get() {
                let roomName = roomNames[this.__packedPos >>> 16];
                if (roomName === undefined) {
                    return utils.getRoomNameFromXY(
                        (this.__packedPos >>> 24) - kMaxWorldSize2,
                        (this.__packedPos >>> 16 & 0xff) - kMaxWorldSize2
                    );
                } else {
                    return roomName;
                }
            },
            set(val) {
                let xy = val === 'sim' ? [-kMaxWorldSize2, -kMaxWorldSize2] : utils.roomNameToXY(val);
                xy[0] += kMaxWorldSize2;
                xy[1] += kMaxWorldSize2;
                if (
                    xy[0] < 0 || xy[0] > kMaxWorldSize || xy[0] !== xy[0] ||
                    xy[1] < 0 || xy[1] > kMaxWorldSize || xy[1] !== xy[1]
                ) {
                    throw new Error('Invalid roomName');
                }
                this.__packedPos = this.__packedPos & ~(0xffff << 16) | xy[0] << 24 | xy[1] << 16;
            },
        },
    });

    RoomPosition.prototype.toJSON = register.wrapFn(function() {
        return Object.assign({
            x: this.x,
            y: this.y,
            roomName: this.roomName,
        }, this);
    });

    RoomPosition.prototype.toString = register.wrapFn(function() {
        return `[room ${this.roomName} pos ${this.x},${this.y}]`;
    });

    RoomPosition.prototype.inRangeTo = register.wrapFn(function(firstArg, secondArg, thirdArg) {
        var x = firstArg, y = secondArg, range = thirdArg, roomName = this.roomName;
        if(_.isUndefined(thirdArg)) {
            var pos = firstArg;
            if(pos.pos) {
                pos = pos.pos;
            }
            x = pos.x;
            y = pos.y;
            roomName = pos.roomName;
            range = secondArg;
        }

        return abs(x - this.x) <= range && abs(y - this.y) <= range && roomName == this.roomName;
    });

    RoomPosition.prototype.isNearTo = register.wrapFn(function(firstArg, secondArg) {
        var [x,y,roomName] = utils.fetchXYArguments(firstArg, secondArg, globals);
        return abs(x - this.x) <= 1 && abs(y - this.y) <= 1 && (!roomName || roomName == this.roomName);
    });

    RoomPosition.prototype.getDirectionTo = register.wrapFn(function(firstArg, secondArg) {
        var [x,y,roomName] = utils.fetchXYArguments(firstArg, secondArg, globals);

        if(!roomName || roomName == this.roomName) {
            return utils.getDirection(x - this.x, y - this.y);
        }

        var [thisRoomX, thisRoomY] = utils.roomNameToXY(this.roomName);
        var [thatRoomX, thatRoomY] = utils.roomNameToXY(roomName);

        return utils.getDirection(thatRoomX*50 + x - thisRoomX*50 - this.x, thatRoomY*50 + y - thisRoomY*50 - this.y);
    });

    RoomPosition.prototype.findPathTo = register.wrapFn(function(firstArg, secondArg, opts) {

        var [x,y,roomName] = utils.fetchXYArguments(firstArg, secondArg, globals),
            room = register.rooms[this.roomName];

        if(_.isObject(secondArg)) {
            opts = _.clone(secondArg);
        }
        opts = opts || {};

        roomName = roomName || this.roomName;

        if(!room) {
            throw new Error(`Could not access room ${this.roomName}`);
        }

        if(roomName == this.roomName || register._useNewPathFinder) {
            return room.findPath(this, new globals.RoomPosition(x,y,roomName), opts);
        }
        else {
            var exitDir = room.findExitTo(roomName);
            if(exitDir < 0) {
                return [];
            }
            var exit = this.findClosestByPath(exitDir, opts);
            if(!exit) {
                return [];
            }
            return room.findPath(this, exit, opts);
        }

    });

    RoomPosition.prototype.findClosestByPath = register.wrapFn(function(type, opts) {

        opts = _.clone(opts || {});

        var room = register.rooms[this.roomName];

        if(!room) {
            throw new Error(`Could not access room ${this.roomName}`);
        }

        if(_.isUndefined(type)) {
            return null;
        }

        if(register._useNewPathFinder) {
            return _findClosestByPath2(this, type, opts);
        }

        opts.serialize = false;

        var result = null,
            isNear,
            endNodes = room.getEndNodes(type, opts);

        if(!opts.algorithm) {

            var minH, sumH = 0;

            endNodes.objects.forEach((i) => {
                var x = i.x, y = i.y, roomName = i.roomName;
                if(i.pos) {
                    x = i.pos.x;
                    y = i.pos.y;
                    roomName = i.pos.roomName;
                }
                var h = max(abs(this.x - x), abs(this.y - y));
                if(_.isUndefined(minH) || minH > h) {
                    minH = h;
                }
                sumH += h;
            });

            opts.algorithm = sumH > minH*10 ? 'dijkstra' : 'astar';
        }

        if(opts.algorithm == 'dijkstra') {

            isNear = 1;

            endNodes.objects.forEach((i) => {
                var distance = this.isEqualTo(i) ? -1 :
                    this.isNearTo(i) ? 0 : 1;
                if(distance < isNear) {
                    result = i;
                    isNear = distance;
                }
            });

            if(isNear == 1) {
                var path = room.findPath(this, endNodes.key, opts);
                if(path.length > 0) {
                    var lastStep = path[path.length-1],
                        lastStepPos = room.getPositionAt(lastStep.x, lastStep.y);
                    result = _.find(endNodes.objects, (i) => lastStepPos.isEqualTo(i));
                }
            }
        }

        if(opts.algorithm == 'astar') {

            endNodes.objects.forEach((i) => {

                var path,
                    distance = this.isEqualTo(i) ? -1 :
                        this.isNearTo(i) ? 0 :
                            (path = this.findPathTo(i, opts)) && path.length > 0 &&
                            room.getPositionAt(path[path.length - 1].x, path[path.length - 1].y).isNearTo(i) ?
                                path.length : undefined;

                if ((_.isUndefined(isNear) || distance <= isNear) && !_.isUndefined(distance)) {
                    isNear = distance;
                    result = i;
                }
            });
        }

        return result;
    });

    RoomPosition.prototype.findInRange = register.wrapFn(function(type, range, opts) {
        var room = register.rooms[this.roomName];

        if(!room) {
            throw new Error(`Could not access room ${this.roomName}`);
        }

        opts = _.clone(opts || {});

        var objects = [],
            result = [];

        if(_.isNumber(type)) {
            objects = room.find(type, opts);
        }
        if(_.isArray(type)) {
            objects = opts.filter ? _.filter(type, opts.filter) : type;
        }

        objects.forEach((i) => {
            if(this.inRangeTo(i, range)) {
                result.push(i);
            }
        });

        return result;
    });

    RoomPosition.prototype.findClosestByRange = register.wrapFn(function(type, opts) {
        var room = register.rooms[this.roomName];

        if(!room) {
            throw new Error(`Could not access room ${this.roomName}`);
        }

        opts = _.clone(opts || {});

        var objects = [],
        result = [];

        if(_.isNumber(type)) {
            objects = room.find(type, opts);
        }
        if(_.isArray(type)) {
            objects = opts.filter ? _.filter(type, opts.filter) : type;
        }

        var closest = null, minRange = Infinity;

        objects.forEach((i) => {
            var range = this.getRangeTo(i);
            if(range < minRange) {
                minRange = range;
                closest = i;
            }
        });

        return closest;
    });

    RoomPosition.prototype.isEqualTo = register.wrapFn(function(firstArg, secondArg) {
        if (firstArg.__packedPos !== undefined) {
            return firstArg.__packedPos === this.__packedPos;
        }
        var [x,y,roomName] = utils.fetchXYArguments(firstArg, secondArg, globals);
        return x == this.x && y == this.y && (!roomName || roomName == this.roomName);
    });

    RoomPosition.prototype.getRangeTo = register.wrapFn(function(firstArg, secondArg) {
        var [x,y,roomName] = utils.fetchXYArguments(firstArg, secondArg, globals);
        if(roomName && roomName != this.roomName) {
            return Infinity;
        }
        return max(abs(this.x - x), abs(this.y - y));
    });

    RoomPosition.prototype.look = register.wrapFn(function() {
        var room = register.rooms[this.roomName];
        if(!room) {
            throw new Error(`Could not access room ${this.roomName}`);
        }
        return room.lookAt(this);
    });

    RoomPosition.prototype.lookFor = register.wrapFn(function(type) {
        if(type == 'terrain') {
            var terrainCode = runtimeData.staticTerrainData[this.roomName][this.y*50+this.x];
            if(terrainCode & C.TERRAIN_MASK_WALL) {
                return ['wall'];
            }
            else if(terrainCode & C.TERRAIN_MASK_SWAMP) {
                return ['swamp'];
            }
            else {
                return ['plain'];
            }
        }
        var room = register.rooms[this.roomName];
        if(!room) {
            throw new Error(`Could not access room ${this.roomName}`);
        }
        return room.lookForAt(type, this);
    });

    RoomPosition.prototype.createFlag = register.wrapFn(function(name, color, secondaryColor) {
        var room = register.rooms[this.roomName];
        if(!room) {
            throw new Error(`Could not access room ${this.roomName}`);
        }
        return room.createFlag(this, name, color, secondaryColor);
    });

    RoomPosition.prototype.createConstructionSite = register.wrapFn(function(structureType, name) {
        var room = register.rooms[this.roomName];
        if(!room) {
            throw new Error(`Could not access room ${this.roomName}`);
        }
        return room.createConstructionSite(this.x, this.y, structureType, name);
    });

    Object.defineProperty(globals, 'RoomPosition', {enumerable: true, value: RoomPosition});


    /**
     * RoomObject
     * @param room
     * @param x
     * @param y
     * @constructor
     */
    var RoomObject = register.wrapFn(function(x, y, room) {
        this.room = register.rooms[room];
        this.pos = new globals.RoomPosition(x,y,room);
    });

    Object.defineProperty(globals, 'RoomObject', {enumerable: true, value: RoomObject});
};
