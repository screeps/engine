var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime) {

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
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }
    if(!target.user && !target.reservation) {
        return;
    }
    if(roomController && roomController.user != object.user && roomController.safeMode > gameTime) {
        return;
    }

    var effect = Math.floor(_.filter(object.body, (i) => i.hits > 0 && i.type == C.CLAIM).length * C.CONTROLLER_CLAIM_DOWNGRADE);
    if(!effect) {
        return;
    }

    if(target.reservation) {
        var endTime = target.reservation.endTime - effect;
        bulk.update(target, {reservation: {endTime}});
    }
    if(target.user) {
        var downgradeTime = target.downgradeTime - effect;
        bulk.update(target, {
            downgradeTime,
            upgradeBlocked: gameTime + C.CONTROLLER_ATTACK_BLOCKED_UPGRADE
        });
    }
    object.actionLog.attack = {x: target.x, y: target.y};
};