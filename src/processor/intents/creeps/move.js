var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

module.exports = function(object, intent, {roomObjects}) {

    if(object.type != 'creep' || object.spawning) {
        return;
    }
    if(!_.some(roomObjects, i => i._pull == object._id) && !_.some(object.body, i => i.hits > 0 && i.type == C.MOVE) || object.fatigue > 0) {
        return;
    }

    var d = null;
    if(intent.direction) {
        d = utils.getOffsetsByDirection(intent.direction);
    }
    if(intent.id) {
        const creep = roomObjects[intent.id];
        if(creep) {
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

    if(!_.any(targetObjects, (target) => _.contains(C.OBSTACLE_OBJECT_TYPES, target.type) &&
        target.type != 'creep' || target.type == 'rampart' && !target.isPublic && object.user != target.user)) {

        movement.add(object, dx, dy);
    }
};
