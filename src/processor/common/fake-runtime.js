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
};

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

const moveTo = function moveTo(creep, target, opts, scope) {
    const {bulk, gameTime, roomTerrrain, roomObjects} = scope;
    terrains = {[creep.room]: roomTerrrain};

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
        _.isUndefined(creep['memory_move']) ||
        _.isUndefined(creep['memory_move']['dest']) ||
        (creep['memory_move']['dest'] != targetPosition.sPackLocal()) ||
        _.isUndefined(creep['memory_move']['time']) ||
        (gameTime > (creep['memory_move']['time'] + opts.reusePath))) {

        const roomCallback = function(roomName) {
            let costMatrix = defaultCostMatrix(roomName, opts, creep, roomObjects);
            if(typeof opts.costCallback == 'function') {
                costMatrix = costMatrix.clone();
                const resultMatrix = opts.costCallback(roomName, costMatrix);
                if(resultMatrix instanceof CostMatrix) {
                    costMatrix = resultMatrix;
                }
            }

            return costMatrix;
        };

        const result = driver.pathFinder.search(
            new RoomPosition(creep.x, creep.y, creep.room),
            { range: opts.range, pos: new RoomPosition(target.x, target.y, target.room) },
            { maxRooms: 1, roomCallback }
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

module.exports.moveTo = moveTo;
module.exports.RoomPosition = RoomPosition;
module.exports.CostMatrix = CostMatrix;
