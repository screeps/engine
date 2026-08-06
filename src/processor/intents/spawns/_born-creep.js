var _ = require('lodash'),
    utils = require('../../../utils'),
    movement = require('../movement');

module.exports = function(spawn, creep, scope) {

    const {roomObjects, roomTerrain, bulk, roomController, gameTime} = scope;

    const roomIsInSafeMode = roomController && roomController.safeMode > gameTime ? roomController.user : false;
    const mySafeMode = roomIsInSafeMode && roomIsInSafeMode == spawn.user;

    var newX, newY, isOccupied, hostileOccupied;

    var directions = [1,2,3,4,5,6,7,8];
    if(spawn.spawning && spawn.spawning.directions) {
        directions = spawn.spawning.directions;
    }
    const otherDirections = _.difference([1,2,3,4,5,6,7,8], directions);
    // find the first direction where the creep can spawn
    for (var direction of directions) {
        var [dx,dy] = utils.getOffsetsByDirection(direction);

        newX = spawn.x + dx;
        newY = spawn.y + dy;
        isOccupied = utils.checkObstacleAtXY(newX, newY, spawn, roomIsInSafeMode, roomObjects, roomTerrain) ||
            movement.isTileBusy(newX, newY);

        if (!isOccupied) {
            break;
        }

        // remember the first direction where we found a hostile creep (not under safemode)
        if(!mySafeMode && !hostileOccupied) {
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

    // spawn is surrounded, spawnstomp the first hostile we found above, unless...
    if(hostileOccupied) {
        // bail if there's an opening we could spawn to but chose not to
        for (var direction of otherDirections) {
            var [dx,dy] = utils.getOffsetsByDirection(direction);

            newX = spawn.x + dx;
            newY = spawn.y + dy;
            isOccupied = utils.checkObstacleAtXY(newX, newY, spawn, roomIsInSafeMode, roomObjects, roomTerrain) ||
                movement.isTileBusy(newX, newY);

            if (!isOccupied) {
                return false;
            }
        }

        require('../creeps/_die')(hostileOccupied, undefined, true, scope);
        bulk.update(creep, {
            x: hostileOccupied.x,
            y: hostileOccupied.y,
            spawning: false
        });
        return true;
    }

    return false;
};
