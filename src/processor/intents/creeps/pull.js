const _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

module.exports = function(object, intent, {roomObjects}) {
    if(object.type != 'creep' || object.spawning || object.fatigue > 0 || !_.some(object.body, i => i.hits > 0 && i.type == C.MOVE)) {
        return;
    }

    const target = roomObjects[intent.id];
    if(target.type != 'creep' || target.spawning) {
        return;
    }

    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }

    movement.addPulling(object, target);
};
