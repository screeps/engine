const _ = require('lodash'),
    utils =  require('../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

let terrains = {};

const RoomPosition = function(x, y, roomName) {
    x = +x;
    y = +y;

    if(_.isNaN(x) || _.isNaN(y) || !_.isString(roomName)) {
        throw new Error('invalid arguments in RoomPosition constructor');
    }

    this.x = x;
    this.y = y;
    this.roomName = roomName;
};

RoomPosition.prototype.isEqualTo = function(p) {
    return p.x == this.x && p.y == this.y && p.roomName == this.roomName;
};

RoomPosition.prototype.getRangeTo = function(p) {
    return p.roomName == this.roomName ? utils.dist(p, this) : Infinity;
};

RoomPosition.prototype.getDirectionTo = function(p) {
    if(p.roomName == this.roomName) {
        return utils.getDirection(p.x - this.x, p.y - this.y);
    }

    const [thisRoomX, thisRoomY] = utils.roomNameToXY(this.roomName);
    const [thatRoomX, thatRoomY] = utils.roomNameToXY(p.roomName);

    return utils.getDirection(thatRoomX*50 + p.x - thisRoomX*50 - this.x, thatRoomY*50 + p.y - thisRoomY*50 - this.y);
};

RoomPosition.prototype.lookFor = function(type) {
    if(type != C.LOOK_TERRAIN) {
        return null;
    }

    if(!terrains[this.roomName]) {
        // disallow movement via unknown terrain
        return 'wall';
    }

    const terrainStrings = ['plain', 'wall', 'swamp', 'wall'];
    return terrainStrings[terrains[this.roomName][50*this.y+this.x]];
};

const packLocal = function(x, y) {
    let uint32 = 0;
    uint32 <<= 6; uint32 |= x;
    uint32 <<= 6; uint32 |= y;

    return String.fromCharCode(32+uint32);
};

RoomPosition.prototype.sPackLocal = function() {
    return packLocal(this.x, this.y);
};

RoomPosition.sUnpackLocal = function(packed, roomName) {
    let uint32 = packed.codePointAt(0);
    if(uint32 < 32) {
        throw new Error(`Invalid uint value ${uint32}`)
    }
    uint32 -= 32;

    const y         = uint32 & 0x3f;  uint32 >>>= 6;
    const x         = uint32 & 0x3f;  uint32 >>>= 6;

    return new RoomPosition(x, y, roomName);
};

const CostMatrix = function() {
    this._bits = new Uint8Array(2500);
};

CostMatrix.prototype.set = function(xx, yy, val) {
    xx = xx|0;
    yy = yy|0;
    this._bits[xx * 50 + yy] = Math.min(Math.max(0, val), 255);
};

CostMatrix.prototype.get = function(xx, yy) {
    xx = xx|0;
    yy = yy|0;
    return this._bits[xx * 50 + yy];
};

CostMatrix.prototype.clone = function() {
    const newMatrix = new CostMatrix;
    newMatrix._bits = new Uint8Array(this._bits);
    return newMatrix;
};

function packPath(roomPositions) {
    return _.reduce(roomPositions, (path, position) => `${path}${position.sPackLocal()}`, '');
}
const defaultCostMatrix = function defaultCostMatrix(roomId, opts, creep, roomObjects) {
    if(creep.room != roomId) {
        // disallow movement via unknown terrain
        return false;
    }

    const costs = new CostMatrix();

    let obstacleTypes = _.clone(C.OBSTACLE_OBJECT_TYPES);
    obstacleTypes.push(C.STRUCTURE_PORTAL);

    if(opts.ignoreDestructibleStructures) {
        obstacleTypes = _.without(obstacleTypes, 'constructedWall','rampart','spawn','extension', 'link','storage','observer','tower','powerBank','powerSpawn','lab','terminal');
    }
    if(opts.ignoreCreeps) {
        obstacleTypes = _.without(obstacleTypes, 'creep');
    }

    _.forEach(roomObjects, function(object) {
        if(
            _.contains(obstacleTypes, object.type) ||
            (!opts.ignoreDestructibleStructures && object.type == 'rampart' && !object.isPublic && object.user != creep.user) ||
            (!opts.ignoreDestructibleStructures && object.type == 'constructionSite' && object.user == creep.user && _.contains(C.OBSTACLE_OBJECT_TYPES, object.structureType))
        ) {
            costs.set(object.x, object.y, Infinity);
        }

        if (object.type == 'swamp' && costs.get(object.x, object.y) == 0) {
            costs.set(object.x, object.y, opts.ignoreRoads ? 5 : 10);
        }

        if (!opts.ignoreRoads && object.type == 'road' && costs.get(object.x, object.y) < Infinity) {
            costs.set(object.x, object.y, 1);
        }
    });

    return costs;
};

const findPath = function findPath(source, target, opts, scope) {
    const {roomTerrain, roomObjects} = scope;
    terrains = {[source.room]: roomTerrain};

    const roomCallback = function(roomName) {
        let costMatrix = defaultCostMatrix(roomName, opts, source, roomObjects);
        if(typeof opts.costCallback == 'function') {
            costMatrix = costMatrix.clone();
            const resultMatrix = opts.costCallback(roomName, costMatrix);
            if(resultMatrix instanceof CostMatrix) {
                costMatrix = resultMatrix;
            }
        }

        return costMatrix;
    };
    const searchOpts = _.clone(opts);
    searchOpts.maxRooms = 1;
    searchOpts.roomCallback = roomCallback;
    if(!searchOpts.ignoreRoads) {
        searchOpts.plainCost = 2;
        searchOpts.swampCost = 10;
    }

    const fromPos = new RoomPosition(source.x, source.y, source.room);

    const ret = driver.pathFinder.search(
        fromPos,
        target,
        searchOpts
    );

    if(target instanceof RoomPosition && !opts.range &&
        (ret.path.length && ret.path[ret.path.length-1].getRangeTo(target) === 1 ||
            !ret.path.length && fromPos.getRangeTo(target) === 1)) {
        ret.path.push(target);
    }

    return ret;
};


const flee = function flee(creep, hostiles, range, opts, scope) {
    const danger = hostiles.map(c => { return {
        pos: new RoomPosition(c.x, c.y, c.room),
        range: range
    }});

    const result = findPath(creep, danger, {flee: true}, scope);
    if(!_.some(result.path)) {
        return 0;
    }

    const fleePosition = result.path[0];
    return utils.getDirection(fleePosition.x - creep.x, fleePosition.y - creep.y);
};

const moveTo = function moveTo(creep, target, opts, scope) {
    const {bulk, gameTime} = scope;

    opts = opts || {};
    if(_.isUndefined(opts.reusePath)) {
        opts.reusePath = 5;
    }
    if(_.isUndefined(opts.range)) {
        opts.range = 0;
    }

    if(utils.dist(creep, target) <= opts.range) {
        return 0;
    }

    const targetPosition = new RoomPosition(target.x, target.y, target.room);
    if(
        !creep['memory_move'] ||
        _.isUndefined(creep['memory_move']['dest']) ||
        (creep['memory_move']['dest'] != targetPosition.sPackLocal()) ||
        _.isUndefined(creep['memory_move']['time']) ||
        (gameTime > (creep['memory_move']['time'] + opts.reusePath))) {

        const result = findPath(
            creep,
            { range: opts.range, pos: new RoomPosition(target.x, target.y, target.room) },
            opts,
            scope
        );
        if(!result.path) {
            return 0;
        }
        const memory_move = {
            dest: targetPosition.sPackLocal(),
            path: packPath(result.path),
            time: gameTime
        };
        bulk.update(creep, {memory_move});
    }

    return nextDirectionByPath(creep, creep['memory_move']['path']);
};

const findClosestByPath = function findClosestByPath(fromPos, objects, opts, scope) {
    if(!_.some(objects)) {
        return null;
    }

    const {roomTerrain} = scope;
    terrains = {[fromPos.room]: roomTerrain};

    opts = opts || {};
    if(_.isUndefined(opts.range)) {
        opts.range = 0;
    }

    const objectHere = _.find(objects, obj => utils.dist(fromPos, obj)==0);
    if(objectHere) {
        return objectHere;
    }

    const goals = _.map(objects, i => { return {range: 1, pos: new RoomPosition(i.x, i.y, i.room)}; });

    const ret = findPath(
        fromPos,
        goals,
        opts,
        scope
    );
    if(!ret.path) {
        return null;
    }

    let result = null;
    let lastPos = fromPos;

    if(ret.path.length) {
        lastPos = ret.path[ret.path.length-1];
    }

    objects.forEach(obj => {
        if(utils.dist(lastPos, obj) <= 1) {
            result = obj;
        }
    });

    return result;
};

const nextDirectionByPath = function(creep, path) {
    const currentPositionIndex = path.indexOf(packLocal(creep.x, creep.y));
    if(currentPositionIndex == path.length - 1) {
        return 0;
    }

    let nextPosition = undefined;
    if(currentPositionIndex < 0) {
        const firstPosition = RoomPosition.sUnpackLocal(path[0], creep.room);
        if(utils.dist(creep, firstPosition) <= 1) {
            nextPosition = firstPosition;
        }
    } else {
        nextPosition = RoomPosition.sUnpackLocal(path[1+currentPositionIndex], creep.room);
    }

    if(!nextPosition) {
        return 0;
    }

    return utils.getDirection(nextPosition.x - creep.x, nextPosition.y - creep.y);
};

const hasActiveBodyparts = function hasActiveBodyparts(creep, part) {
    return !!creep.body && _.some(creep.body, p => (p.hits > 0) && (p.type==part));
};

module.exports.findPath = findPath;
module.exports.findClosestByPath = findClosestByPath;
module.exports.moveTo = moveTo;
module.exports.flee = flee;
module.exports.RoomPosition = RoomPosition;
module.exports.CostMatrix = CostMatrix;
module.exports.hasActiveBodyparts = hasActiveBodyparts;
