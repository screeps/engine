var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

module.exports = function(object, intent, {roomObjects}) {

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning || object.fatigue > 0) {
        return;
    }
    if(_.filter(object.body, (i) => i.hits > 0 && i.type == C.MOVE).length == 0) {
        return;
    }

    if(!intent.direction) {
        return;
    }

    var d = utils.getOffsetsByDirection(intent.direction);

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