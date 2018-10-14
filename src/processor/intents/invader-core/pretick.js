const _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    stronghold = require('stronghold');

module.exports = function(object, scope) {
    if(!object.hits || (object.hits < object.hitsMax)) {
        return;
    }

    const behavior = object.strongholdBehavior || 'default';
    if(!stronghold.behaviors[behavior]) {
        return;
    }

    return stronghold.behaviors[behavior];
};
