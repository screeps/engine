const _ = require('lodash'),
    utils = require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    fakeRuntime = require('../../../common/fake-runtime'),
    defence = require('./defence');

module.exports = function(creep, context) {
    const { ramparts, intents } = context;

    if(!creep.store.energy || !_.some(ramparts)) {
        return;
    }

    const repairRamparts = _.filter(ramparts, r => r.hitsTarget && r.hits < r.hitsTarget);
    if(!_.some(repairRamparts)) {
        return;
    }

    const target = _.first(repairRamparts);
    if(!target) {
        return;
    }

    if(utils.dist(creep, target) <= 3) {
        intents.set(creep._id, 'repair', {id: target._id, x: target.x, y: target.y});
        return;
    }

    const safeMatrixCallback = defence.createSafeMatrixCallback(context);

    fakeRuntime.walkTo(creep, target, { range: 3, costCallback: safeMatrixCallback }, context);
    const targetInRange = _.first(_.filter(repairRamparts, r => utils.dist(creep, r) <= 3));
    intents.set(creep._id, 'repair', {id: targetInRange._id, x: targetInRange.x, y: targetInRange.y});
};
