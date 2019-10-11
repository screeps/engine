const _ = require('lodash'),
    utils = require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

const makeBody = function(description) {
    return _.reduce(description, (result, segment) => {
        _.times(segment.count, () => {result.body.push(segment.part); result.boosts.push(segment.boost)});
        return result;
    }, { body: [], boosts: [] });
};

module.exports = {
    'fortifier': makeBody([
        {part: C.WORK, count: 15, boost: 'XLH2O'},
        {part: C.CARRY, count: 15},
        {part: C.MOVE, count: 15}
    ]),
    'weakDefender': makeBody([
        {part: C.ATTACK, count: 15},
        {part: C.MOVE, count: 15}
    ]),
    'fullDefender': makeBody([
        {part: C.ATTACK, count: 25},
        {part: C.MOVE, count: 25}
    ]),
    'boostedDefender': makeBody([
        {part: C.ATTACK, count: 25, boost: 'UH2O'},
        {part: C.MOVE, count: 25}
    ]),
    'fullBoostedMelee': makeBody([
        {part: C.ATTACK, count: 44, boost: 'XUH2O'},
        {part: C.MOVE, count: 6, boost: 'XZHO2'}
    ]),
    'fullBoostedRanger': makeBody([
        {part: C.RANGED_ATTACK, count: 44, boost: 'XKHO2'},
        {part: C.MOVE, count: 6, boost: 'XZHO2'}
    ]),
};
