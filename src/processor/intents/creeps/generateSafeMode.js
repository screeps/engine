var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk}) {

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
    if(!object.store || !(object.store[C.RESOURCE_GHODIUM] >= C.SAFE_MODE_COST)) {
        return;
    }

    bulk.update(target, {safeModeAvailable: (target.safeModeAvailable || 0) + 1});
    bulk.update(object, {store: {[C.RESOURCE_GHODIUM]: object.store[C.RESOURCE_GHODIUM] - C.SAFE_MODE_COST}});
};
