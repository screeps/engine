var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

module.exports = function(spawn, creep, roomObjects, roomTerrain, bulk, stats) {

    var newX, newY, isOccupied, hostileOccupied;
    var checkObstacleFn = (i) => _.contains(C.OBSTACLE_OBJECT_TYPES, i.type) && i.x == newX && i.y == newY;

    for (var direction = 1; direction <= 8; direction++) {
        var [dx,dy] = utils.getOffsetsByDirection(direction);

        newX = spawn.x + dx;
        newY = spawn.y + dy;
        isOccupied = _.any(roomObjects, checkObstacleFn) ||
            utils.checkTerrain(roomTerrain, newX, newY, C.TERRAIN_MASK_WALL) ||
            movement.isTileBusy(newX, newY);

        if (!isOccupied) {
            break;
        }

        if(!hostileOccupied) {
            hostileOccupied = _.find(roomObjects, i => i.x == newX && i.y == newY && i.type == 'creep' && i.user != spawn.user);
        }
    }

    if(!isOccupied) {
        bulk.update(creep, {
            x: newX,
            y: newY,
            spawning: false
        });
        return true;
    }
    else if(hostileOccupied) {
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