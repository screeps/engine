var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, roomController, gameTime, eventLog}) {

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'creep' || target.spawning) {
        return;
    }
    if(Math.abs(target.x - object.x) > 3 || Math.abs(target.y - object.y) > 3) {
        return;
    }
    if(roomController && roomController.user != object.user && roomController.safeMode > gameTime) {
        return;
    }

    var healPower = utils.calcBodyEffectiveness(object.body, C.HEAL, 'rangedHeal', C.RANGED_HEAL_POWER);

    target._healToApply = (target._healToApply || 0) + healPower;

    object.actionLog.rangedHeal = {x: target.x, y: target.y};
    target.actionLog.healed = {x: object.x, y: object.y};

    eventLog.push({event: C.EVENT_HEAL, objectId: object._id, data: {targetId: target._id, amount: healPower, healType: EVENT_HEAL_TYPE_RANGED}});
};