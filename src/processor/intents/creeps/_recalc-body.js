var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function recalcBody(object) {

    var hits = object.hits;

    for(var i = object.body.length-1; i>=0; i--) {
        object.body[i]._oldHits = object.body[i]._oldHits || object.body[i].hits;
        if(hits > 100)
            object.body[i].hits = 100;
        else
            object.body[i].hits = hits;
        hits -= 100;
        if(hits < 0) hits = 0;
    }

    object.energyCapacity = utils.calcBodyEffectiveness(object.body, C.CARRY, 'capacity', C.CARRY_CAPACITY, true);
};