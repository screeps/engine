const _ = require('lodash'),
    utils = require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    fakeRuntime = require('../../../common/fake-runtime'),
    defence = require('./defence');

module.exports = function(creep, context) {
    const { hostiles, intents, scope } = context;

    if(!_.some(hostiles)) {
        return;
    }

    const safeMatrixCallback = defence.createSafeMatrixCallback(context);

    const target = fakeRuntime.findClosestByPath(creep, hostiles, { costCallback: safeMatrixCallback }, scope);

    if(!target) {
        return;
    }

    if(utils.dist(creep, target) <= 1) {
        intents.set(creep._id, 'attack', {id: target._id, x: target.x, y: target.y});
    } else {
        fakeRuntime.walkTo(creep, target,{ costCallback: safeMatrixCallback }, context);
    }
};
