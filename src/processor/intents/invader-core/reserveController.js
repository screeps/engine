var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {
    const {roomObjects, bulk, gameTime, eventLog} = scope;

    if(object.type != 'invaderCore') {
        return;
    }

    const target = roomObjects[intent.id];
    if(!target || target.type != 'controller') {
        return;
    }

    if(target.user || target.reservation && target.reservation.user != object.user) {
        return;
    }

    if(!target.reservation) {
        target.reservation = {
            user: object.user,
            endTime: gameTime+1
        };
    }

    const effect = C.INVADER_CORE_CONTROLLER_POWER * C.CONTROLLER_RESERVE;
    if(target.reservation.endTime + effect > gameTime + C.CONTROLLER_RESERVE_MAX) {
        return;
    }

    object.actionLog.reserveController = {x: target.x, y: target.y};

    target.reservation.endTime += effect;
    bulk.update(target, {reservation: target.reservation});

    eventLog.push({event: C.EVENT_RESERVE_CONTROLLER, objectId: object._id, data: {amount: effect}});
};
