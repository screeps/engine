var _ = require('lodash'),
    utils =  require('../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    matrix,
    objects,
    affectedCnt,
    roomObjects,
    roomTerrain;

function checkObstacleAtXY(x,y,object, roomIsInSafeMode) {

    return _.any(roomObjects, (i) => i.x == x && i.y == y &&
        (i.type == 'creep' && !objects[i._id] && (!roomIsInSafeMode || roomIsInSafeMode != object.user || roomIsInSafeMode == object.user && object.user == i.user) ||
        i.type != 'creep' && _.contains(C.OBSTACLE_OBJECT_TYPES, i.type) ||
        i.type == 'rampart' && !i.isPublic && i.user != object.user ||
        i.type == 'constructionSite' && i.user == object.user && _.contains(C.OBSTACLE_OBJECT_TYPES, i.structureType) ))
        || utils.checkTerrain(roomTerrain, x, y, C.TERRAIN_MASK_WALL);
}

function calcResourcesWeight(creep) {
    var totalCarry = 0, weight = 0;
    C.RESOURCES_ALL.forEach(resourceType => {
        totalCarry += creep[resourceType] || 0;
    });
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
                var moveBodyparts = _.filter(object.body, (i) => i.hits > 0 && i.type == C.MOVE).length,
                    weight = _.filter(object.body, (i) => i.type != C.MOVE && i.type != C.CARRY).length;
                weight += calcResourcesWeight(object);
                weight = weight || 1;
                var key = `${object.x},${object.y}`,
                    rate1 = affectedCnt[key] || 0;
                if(matrix[key] && _.any(matrix[key], {x,y})) {
                    rate1 = 100;
                }
                return {
                    object,
                    rate1,
                    rate2: moveBodyparts / weight
                };
            });

            rates.sort((a,b) => b.rate1 - a.rate1 != 0 ? b.rate1 - a.rate1 : b.rate2 - a.rate2);

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

        var object = matrix[i],
            dx = x - object.x,
            dy = y - object.y;

        var obstacle =  checkObstacleAtXY(x,y, object, roomIsInSafeMode);

        if(obstacle) {
            removeFromMatrix(i);
        }
    }
};

exports.execute = function(object, bulk, roomController, gameTime) {

    var move = objects[object._id];
    if(!move) {
        return;
    }

    var ceilObjects = _.filter(roomObjects, (i) => i.x == move.x && i.y == move.y);

    var fatigueRate = 2;

    if(_.any(ceilObjects, {type: 'swamp'}) ||
        utils.checkTerrain(roomTerrain, move.x, move.y, C.TERRAIN_MASK_SWAMP)) {
        fatigueRate = 10;
    }

    var road = _.find(ceilObjects, {type: 'road'});

    if(road) {
        fatigueRate = 1;
        road.nextDecayTime -= C.ROAD_WEAROUT * object.body.length;
        bulk.update(road, {nextDecayTime: road.nextDecayTime});
    }

    if(!roomController || !(roomController.safeMode > gameTime)) {
        var constructionSite = _.find(ceilObjects, (i) => i.type == 'constructionSite' && i.user != object.user);
        if (constructionSite) {
            require('./construction-sites/remove')(constructionSite, roomObjects, bulk);
        }
    }

    var fatigue = _(object.body).filter((i) => i.type != C.MOVE && i.type != C.CARRY).size();
    fatigue += calcResourcesWeight(object);
    fatigue *= fatigueRate;

    if((move.x == 0 || move.x == 49 || move.y == 0 || move.y == 49) &&
       !(object.x == 0 || object.x == 49 || object.y == 0 || object.y == 49)) {
        fatigue = 0;
    }

    bulk.update(object, {
        x: move.x,
        y: move.y,
        fatigue
    });
};