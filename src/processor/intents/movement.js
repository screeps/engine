var _ = require('lodash'),
    utils =  require('../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    matrix,
    objects,
    affectedCnt,
    roomObjects,
    roomTerrain;

function canMove(object) {
    return object.type == 'powerCreep' ||
        (!!object._pulled || !object._oldFatigue && _.some(object.body, i => i.hits > 0 && i.type == C.MOVE));
}

function checkObstacleAtXY(x,y,object, roomIsInSafeMode) {
    var hasObstacle = false, hasRoad = false;
    _.forEach(roomObjects, (i) => {
        if (i.x != x || i.y != y) {
            return;
        }
        if ((i.type == 'creep' || i.type == 'powerCreep') && !objects[i._id] && (!roomIsInSafeMode || roomIsInSafeMode != object.user || roomIsInSafeMode == object.user && object.user == i.user) ||
            i.type != 'creep' && i.type != 'powerCreep' && _.contains(C.OBSTACLE_OBJECT_TYPES, i.type) ||
            i.type == 'rampart' && !i.isPublic && i.user != object.user ||
            i.type == 'constructionSite' && i.user == object.user && _.contains(C.OBSTACLE_OBJECT_TYPES,
                i.structureType)) {
            hasObstacle = true;
            return false;
        }
        if(i.type == 'road') {
            hasRoad = true;
        }
    });
    if(hasObstacle) {
        return true;
    }
    return utils.checkTerrain(roomTerrain, x, y, C.TERRAIN_MASK_WALL) && !hasRoad;

}

function calcResourcesWeight(creep) {
    var totalCarry = _.sum(creep.store), weight = 0;
    for(var i = creep.body.length-1; i >= 0; i--) {
        if(!totalCarry) {
            break;
        }
        var part = creep.body[i];
        if(part.type != C.CARRY || !part.hits) {
            continue;
        }
        var boost = 1;
        if(part.boost) {
            boost = C.BOOSTS[C.CARRY][part.boost].capacity || 1;
        }
        totalCarry -= Math.min(totalCarry, C.CARRY_CAPACITY * boost);
        weight++;
    }
    return weight;
}

exports.init = function(_roomObjects, _roomTerrain) {
    matrix = {};
    objects = {};
    affectedCnt = {};
    roomObjects = _roomObjects;
    roomTerrain = _roomTerrain;
};

exports.addPulling = function(object, target) {
    const checkRecursiveTarget = t=>t._id==object._id || !!t._pull && !!roomObjects[t._pull] && checkRecursiveTarget(roomObjects[t._pull]);
    if(!checkRecursiveTarget(target)) {
        object._pull = target._id;
        target._pulled = object._id;
    }
};

exports.removePulling = function(object) {
    if(object._pull && !!roomObjects[object._pull]) {
        delete roomObjects[object._pull]._pulled;
    }
    delete object._pull;
};

exports.add = function(object, dx, dy) {
    var newX = object.x + dx,
        newY = object.y + dy;

    if (newX >= 50) newX = 49;
    if (newY >= 50) newY = 49;
    if (newX < 0) newX = 0;
    if (newY < 0) newY = 0;

    var key = `${newX},${newY}`;
    matrix[key] = matrix[key] || [];
    matrix[key].push(object);

    affectedCnt[key] = affectedCnt[key]+1 || 1;
};

exports.isTileBusy = function(x,y) {
    return !!matrix[`${x},${y}`];
};

exports.check = function(roomIsInSafeMode) {
    var newMatrix = {};

    for(var i in matrix) {

        var [x,y] = i.split(/,/),
            resultingMoveObject;

        x = parseInt(x);
        y = parseInt(y);

        if(matrix[i].length > 1) {
            var rates = _.map(matrix[i], (object) => {
                var moves = object.type == 'powerCreep' ? 0 :
                        utils.calcBodyEffectiveness(object.body, C.MOVE, 'fatigue', 1),
                    weight = object.type == 'powerCreep' ? 0 :
                        _.filter(object.body, (i) => i.type != C.MOVE && i.type != C.CARRY).length;
                weight += object.type == 'powerCreep' ? 0 :
                    calcResourcesWeight(object);
                weight = weight || 1;
                var key = `${object.x},${object.y}`,
                    rate1 = affectedCnt[key] || 0;
                if(matrix[key] && _.any(matrix[key], {x,y})) {
                    rate1 = 100;
                }

                return {
                    object,
                    rate1,
                    rate2: !!object._pulled?1:0,
                    rate3: !!object._pull?1:0,
                    rate4: moves / weight
                };
            });

            rates.sort((a,b) => b.rate1 - a.rate1 || b.rate2 - a.rate2 || b.rate3 - a.rate3 || b.rate4 - a.rate4);

            resultingMoveObject = rates[0].object;
        }
        else {
            resultingMoveObject = matrix[i][0];
        }

        objects[resultingMoveObject._id] = {x,y};

        newMatrix[i] = resultingMoveObject;
    }

    matrix = newMatrix;

    function removeFromMatrix(i) {
        var object = matrix[i];
        objects[matrix[i]._id] = null;
        delete matrix[i];

        if(object) {
            var key = `${object.x},${object.y}`;
            if(matrix[key]) {
                removeFromMatrix(key);
            }
        }
    }

    for(var i in matrix) {

        var [x,y] = i.split(/,/);

        x = parseInt(x);
        y = parseInt(y);

        var object = matrix[i];

        if(!!object._pulled && !!roomObjects[object._pulled]) {
            if(roomObjects[object._pulled]._pull != object._id || i != `${roomObjects[object._pulled].x},${roomObjects[object._pulled].y}`) {
                delete roomObjects[object._pulled]._pull;
                delete object._pulled;
            }
        }

        if(!canMove(object) || !!checkObstacleAtXY(x,y, object, roomIsInSafeMode)) {
            removeFromMatrix(i);
        }
    }
};

exports.execute = function(object, scope) {

    const {bulk, roomController, gameTime} = scope;

    var move = objects[object._id];
    if(!move) {
        return;
    }

    if(!canMove(object)) {
        return;
    }

    var cellObjects = _.filter(roomObjects, (i) => i.x == move.x && i.y == move.y);

    var fatigueRate = 2;

    if(_.any(cellObjects, {type: 'swamp'}) ||
        utils.checkTerrain(roomTerrain, move.x, move.y, C.TERRAIN_MASK_SWAMP)) {
        fatigueRate = 10;
    }

    var road = _.find(cellObjects, {type: 'road'});

    if(road) {
        fatigueRate = 1;
        if(object.type == 'powerCreep') {
            road.nextDecayTime -= C.ROAD_WEAROUT_POWER_CREEP;
        }
        else {
            road.nextDecayTime -= C.ROAD_WEAROUT * object.body.length;
        }
        bulk.update(road, {nextDecayTime: road.nextDecayTime});
    }

    if(!roomController || roomController.user === object.user || !(roomController.safeMode > gameTime)) {
        var constructionSite = _.find(cellObjects, (i) => i.type == 'constructionSite' && i.user != object.user);
        if (constructionSite) {
            bulk.remove(constructionSite._id);
            if(constructionSite.progress > 1) {
                require('./_create-energy')(constructionSite.x, constructionSite.y,
                    constructionSite.room, Math.floor(constructionSite.progress/2), 'energy', scope);
            }
        }
    }

    var fatigue;
    if(object.type == 'creep') {
        fatigue = _(object.body).filter((i) => i.type != C.MOVE && i.type != C.CARRY).size();
        fatigue += calcResourcesWeight(object);
        fatigue *= fatigueRate;
    }

    if(utils.isAtEdge(move) && !utils.isAtEdge(object)) {
        fatigue = 0;
        object._fatigue = 0;
        bulk.update(object, { x: move.x, y: move.y, fatigue });
    } else {
        bulk.update(object, { x: move.x, y: move.y });
        if(object.type == 'creep') {
            require('./creeps/_add-fatigue')(object, fatigue, scope);
        }
    }
};
