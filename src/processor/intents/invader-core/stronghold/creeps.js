const _ = require('lodash'),
    utils = require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    fakeRuntime = require('../../../common/fake-runtime'),
    defence = require('./defence');

const makeBody = function(description) {
    return _.reduce(description, (result, segment) => {
        _.times(segment.count, () => {result.body.push(segment.part); result.boosts.push(segment.boost)});
        return result;
    }, { body: [], boosts: [] });
};

const behaviors = {
    'coordinated': function coordinatedDefender(creep, context) {
        const { spots, scope, intents, roomObjects, core, defenders } = context;
        const safeMatrixCallback = defence.createSafeMatrixCallback(context);
        const creeps = _.clone(defenders);
        for(let spot in spots) {
            const creep = roomObjects[spots[spot]];
            _.pull(creeps, creep);
            if(!creep) {
                continue;
            }
            if(50*creep.x+creep.y == spot) {
                continue;
            }
            fakeRuntime.walkTo(creep, {x:Math.floor(spot/50), y:spot%50, room: creep.room},{ range: 0, costCallback: safeMatrixCallback }, context);
        }
        if(core.spawning) {
            for(let creep of creeps) {
                if(utils.dist(creep, core) == 1) {
                    const direction = fakeRuntime.flee(creep, [core], 2, { costCallback: safeMatrixCallback }, scope);
                    if(direction) {
                        intents.set(creep._id, 'move', { direction });
                        return true;
                    }
                }
            }
        }
    },
    'simple-melee': function simpleMelee(creep, context) {
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
    },
    'fortifier': function fortifier(creep, context) {
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
    }
};

const bodies = {
    fortifier: makeBody([
        {part: C.WORK, count: 15, boost: 'XLH2O'},
        {part: C.CARRY, count: 15},
        {part: C.MOVE, count: 15}
    ]),
    weakDefender: makeBody([
        {part: C.ATTACK, count: 15},
        {part: C.MOVE, count: 15}
    ]),
    fullDefender: makeBody([
        {part: C.ATTACK, count: 25},
        {part: C.MOVE, count: 25}
    ]),
    boostedDefender: makeBody([
        {part: C.ATTACK, count: 25, boost: 'UH2O'},
        {part: C.MOVE, count: 25}
    ]),
    boostedRanger: makeBody([
        {part: C.RANGED_ATTACK, count: 25, boost: 'KHO2'},
        {part: C.MOVE, count: 25}
    ]),
    fullBoostedMelee: makeBody([
        {part: C.ATTACK, count: 44, boost: 'XUH2O'},
        {part: C.MOVE, count: 6, boost: 'XZHO2'}
    ]),
    fullBoostedRanger: makeBody([
        {part: C.RANGED_ATTACK, count: 44, boost: 'XKHO2'},
        {part: C.MOVE, count: 6, boost: 'XZHO2'}
    ]),
};

module.exports = { bodies, behaviors };
