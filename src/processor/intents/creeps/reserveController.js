var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, gameTime, eventLog}) {

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'controller') {
        return;
    }
    if(Math.abs(target.x - object.x) > C.RANGE_RESERVE_CONTROLLER || Math.abs(target.y - object.y) > C.RANGE_RESERVE_CONTROLLER) {
        return;
    }
    if(target.user || target.reservation && target.reservation.user != object.user) {
        return;
    }

    var effect =  _.filter(object.body, (i) => i.hits > 0 && i.type == C.CLAIM).length * C.CONTROLLER_RESERVE;
    if(!effect) {
        return;
    }

    if(!target.reservation) {
        target.reservation = {
            user: object.user,
            endTime: gameTime+1
        };
    }


    if(target.reservation.endTime + effect > gameTime + C.CONTROLLER_RESERVE_MAX) {
        return;
    }

    object.actionLog.reserveController = {x: target.x, y: target.y};

    target.reservation.endTime += effect;
    bulk.update(target, {reservation: target.reservation});

    eventLog.push({event: C.EVENT_RESERVE_CONTROLLER, objectId: object._id, data: {amount: effect}});
};
