var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, gameTime}) {


    var target = roomObjects[intent.id];
    if(!target || target.type != 'powerCreep') {
        return;
    }
    if(utils.dist(object, target) > 1) {
        return;
    }

    bulk.update(target, {ageTime: gameTime + C.CREEP_LIFE_TIME});

    target.actionLog.healed = {x: target.x, y: target.y};

};
