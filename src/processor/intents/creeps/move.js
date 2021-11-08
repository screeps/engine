var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

module.exports = function(object, intent, {roomObjects}) {

    if(object.spawning) {
        return;
    }

    object._oldFatigue = object.fatigue;

    var d = null;
    if(intent.direction) {
        d = utils.getOffsetsByDirection(intent.direction);
    }
    if(intent.id) {
        const creep = roomObjects[intent.id];
        if(creep && creep.type == 'creep' && utils.dist(object, creep) == 1) {
            d = [creep.x-object.x, creep.y-object.y];
        }
    }

    if(!d) {
        return;
    }

    var [dx,dy] = d;

    if(object.x + dx < 0 || object.x + dx > 49 || object.y + dy < 0 || object.y + dy > 49) {
        return;
    }

    var targetObjects = _.filter(roomObjects, {x: object.x+dx, y: object.y+dy});

    if(!_.some(targetObjects, (target) => _.includes(C.OBSTACLE_OBJECT_TYPES, target.type) &&
        target.type != 'creep' && target.type != 'powerCreep' ||
        target.type == 'rampart' && !target.isPublic && object.user != target.user ||
        object.type == 'powerCreep' && target.type == 'portal' && target.destination.shard)) {

        movement.add(object, dx, dy);
    }
};
