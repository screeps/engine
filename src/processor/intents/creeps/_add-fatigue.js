const _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, dFatigue, {roomObjects, bulk}) {
    if(dFatigue > 0) {
        while(object._pulled) {
            object = roomObjects[object._pulled];
        }
    }

    object._fatigue = object._fatigue || object.fatigue;
    object._fatigue += dFatigue;

    const fatigue = Math.max(0, object._fatigue);
    if(object.fatigue != fatigue) {
        bulk.update(object, { fatigue });
    }
};
