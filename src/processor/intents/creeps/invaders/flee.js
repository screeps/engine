const _ = require('lodash'),
    utils =  require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    fakeRuntime = require('../../../common/fake-runtime');

module.exports = function(creep, range, context) {
    const {scope, intents, hostiles} = context;

    const nearCreeps = hostiles.filter(c => utils.dist(creep, c) < range);
    if(nearCreeps.length > 0) {
        const direction = fakeRuntime.flee(creep, nearCreeps, range, {}, scope);
        if(direction) {
            intents.set(creep._id, 'move', { direction });
            return true;
        }
    }

    return false;
};
