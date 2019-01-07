const _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, dFatigue, {roomObjects, bulk}) {
//    console.log(`add-fatigue ${dFatigue} called for ${}`)

    if(_.isUndefined(object._fatigue)) { object._fatigue = object.fatigue }

    if((object._fatigue > 0) && (dFatigue < 0)) { // MOVES contribution removes own fatigue first
        const resting = Math.min(object._fatigue, -dFatigue);
        object._fatigue -= resting;
        dFatigue += resting;

        const fatigue = Math.max(0, object._fatigue);
        if(object.fatigue != fatigue) {
            bulk.update(object, { fatigue });
        }

        if(dFatigue == 0) {
            return;
        }
    }

    while(!!object._pulled && !!roomObjects[object._pulled]) {
        object = roomObjects[object._pulled];
    }

    if(_.isUndefined(object._fatigue)) { object._fatigue = object.fatigue }
    object._fatigue += dFatigue;

    const fatigue = Math.max(0, object._fatigue);
    if(object.fatigue != fatigue) {
        bulk.update(object, { fatigue });
    }
};
