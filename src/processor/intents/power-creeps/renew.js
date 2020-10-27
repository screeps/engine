var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, roomController, bulk, gameTime}) {

    var target = roomObjects[intent.id];
    if(!target || target.type != 'powerBank' && target.type != 'powerSpawn') {
        return;
    }
    if(utils.dist(object, target) > C.RANGE_RENEW_POWERCREEP) {
        return;
    }

    if(target.type == 'powerSpawn' && !utils.checkStructureAgainstController(target, roomObjects, roomController)) {
        return;
    }

    bulk.update(object, {ageTime: gameTime + C.POWER_CREEP_LIFE_TIME});

    object.actionLog.healed = {x: object.x, y: object.y};
};
