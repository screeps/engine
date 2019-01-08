var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk}) {

    var target = roomObjects[intent.id];
    if(!target || target.type != 'controller') {
        return;
    }
    if(utils.dist(object, target) > 1) {
        return;
    }

    bulk.update(target, {isPowerEnabled: true});

    object.actionLog.attack = {x: target.x, y: target.y};
};