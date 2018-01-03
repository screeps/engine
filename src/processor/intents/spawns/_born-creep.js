var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

module.exports = function(spawn, creep, roomObjects, roomTerrain, bulk, stats) {

    var newX, newY, isOccupied, hostileOccupied;
    var checkObstacleFn = (i) => _.contains(C.OBSTACLE_OBJECT_TYPES, i.type) && i.x == newX && i.y == newY;

    const spawnDirections = spawn.spawning.spawnDirections || spawn.spawnDirections || [1,2,3,4,5,6,7,8];
    const otherDirections = _.difference([1,2,3,4,5,6,7,8], spawnDirections);
    // find the first direction where the creep can spawn
    for (var direction of spawnDirections) {
        var [dx,dy] = utils.getOffsetsByDirection(direction);

        newX = spawn.x + dx;
        newY = spawn.y + dy;
        isOccupied = _.any(roomObjects, checkObstacleFn) ||
            utils.checkTerrain(roomTerrain, newX, newY, C.TERRAIN_MASK_WALL) ||
            movement.isTileBusy(newX, newY);

        if (!isOccupied) {
            break;
        }

        // remember the first direction where we found a hostile creep
        if(!hostileOccupied) {
            hostileOccupied = _.find(roomObjects, i => i.x == newX && i.y == newY && i.type == 'creep' && i.user != spawn.user);
        }
    }

    // if we found a place to spawn, do so
    if(!isOccupied) {
        bulk.update(creep, {
            x: newX,
            y: newY,
            spawning: false
        });
        return true;
    }

    // bail if there's an opening we could spawn to but chose not to
    for (var direction of otherDirections) {
        var [dx,dy] = utils.getOffsetsByDirection(direction);

        newX = spawn.x + dx;
        newY = spawn.y + dy;
        isOccupied = _.any(roomObjects, checkObstacleFn) ||
            utils.checkTerrain(roomTerrain, newX, newY, C.TERRAIN_MASK_WALL) ||
            movement.isTileBusy(newX, newY);

        if (!isOccupied) {
            return false;
        }
    }

    // spawn is surrounded, spawnstomp the first hostile we found above
    if(hostileOccupied) {
        require('../creeps/_die')(hostileOccupied, roomObjects, bulk, stats);
        bulk.update(creep, {
            x: hostileOccupied.x,
            y: hostileOccupied.y,
            spawning: false
        });
        return true;
    }

    return false;
};