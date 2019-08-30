const _ = require('lodash'),
    utils = require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    fakeRuntime = require('../../../common/fake-runtime');

module.exports = function(creep, context) {
    const { ramparts, intents, scope } = context;

    if(!creep.store.energy || !_.some(ramparts)) {
        return;
    }

    const weakestRampart = _.max(ramparts, r => r.hitsMax - r.hits);
    if(!weakestRampart) {
        return;
    }

    if(utils.dist(creep, weakestRampart) <= 3) {
        intents.set(creep._id, 'repair', {id: weakestRampart._id, x: weakestRampart.x, y: weakestRampart.y});
        return;
    }

    fakeRuntime.walkTo(creep, weakestRampart, { range: 3}, context);
    const weakestInRange = _.max(_.filter(ramparts, r => utils.dist(creep, r) <= 3), r => r.hitsMax - r.hits);
    intents.set(creep._id, 'repair', {id: weakestInRange._id, x: weakestInRange.x, y: weakestInRange.y});
};
