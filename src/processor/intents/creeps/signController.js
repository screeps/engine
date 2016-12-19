var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, gameTime}) {

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
    if(Math.abs(target.x - object.x) > C.RANGE_SIGN_CONTROLLER || Math.abs(target.y - object.y) > C.RANGE_SIGN_CONTROLLER) {
        return;
    }

    bulk.update(target, {sign: intent.sign ? {
        user: object.user,
        text: intent.sign,
        time: gameTime,
        datetime: Date.now()
    } : null});
};