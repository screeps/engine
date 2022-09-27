const _ = require('lodash'),
    utils =  require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    fakeRuntime = require('../../../common/fake-runtime'),
    flee = require('./flee');

module.exports = function(creep, context) {
    const {scope, intents, invaders} = context;

    let healTargets = invaders.filter(c => utils.dist(c, creep) <= 3);
    if(healTargets.length > 0) {
        const healTarget = healTargets.sort((a, b) => (b.hitsMax - b.hits) - (a.hitsMax - a.hits))[0];
        if(utils.dist(creep, healTarget) <= 1) {
            intents.set(creep._id, 'heal', {id: healTarget._id, x: healTarget.x, y: healTarget.y});
        } else {
            intents.set(creep._id, 'rangedHeal', {id: healTarget._id});
        }
    }

    if(creep.hits < creep.hitsMax / 2) {
        if(!flee(creep, 4, context)) {
            const fleeTarget = fakeRuntime.findClosestByPath(
                creep,
                invaders.filter(c => (c != creep) && fakeRuntime.hasActiveBodyparts(c, C.HEAL)),
                null,
                scope);

            if(fleeTarget) {
                const direction = fakeRuntime.moveTo(creep, fleeTarget, {range: 1}, scope);
                if(direction) {
                    intents.set(creep._id, 'move', { direction });
                }
            }
        }

        return;
    }

    let target = fakeRuntime.findClosestByPath(creep, invaders.filter(c => c.hits < c.hitsMax), null, scope);
    if(!target) {
        if(flee(creep, 4, context)) {
            return;
        }
        target = fakeRuntime.findClosestByPath(creep, invaders.filter(c => (c != creep) && !fakeRuntime.hasActiveBodyparts(c, C.HEAL)), null, scope);
    }

    if(!target) {
        intents.set(creep._id, 'suicide', {});
        return;
    }
    let direction = 0;
    if(utils.dist(creep, target) <= 1) {
        direction = utils.getDirection(target.x-creep.x,target.y-creep.y);
    } else {
        direction = fakeRuntime.moveTo(creep, target, {range: 1}, scope);
    }
    if(direction) {
        intents.set(creep._id, 'move', { direction });
    }
};
