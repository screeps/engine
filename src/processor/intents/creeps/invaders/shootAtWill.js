const _ = require('lodash'),
    utils =  require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    fakeRuntime = require('../../../common/fake-runtime');

module.exports = function(creep, context) {
    if(!fakeRuntime.hasActiveBodyparts(creep, C.RANGED_ATTACK)) {
        return;
    }

    const { intents, hostiles } = context;

    const targets = _.filter(hostiles, c => utils.dist(creep, c) <= 3);

    if(!_.some(targets)){
        return;
    }

    const target = _.min(targets, 'hits');
    intents.set(creep._id, 'rangedAttack', {id: target._id});
};
