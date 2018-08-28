var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, stats, eventLog}) {

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning || object.energy <= 0) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || !C.CONSTRUCTION_COST[target.type] || target.hits >= target.hitsMax) {
        return;
    }
    if(Math.abs(target.x - object.x) > 3 || Math.abs(target.y - object.y) > 3) {
        return;
    }
    if(!target.hitsMax) {
        return;
    }

    var repairPower = _.filter(object.body, (i) => (i.hits > 0 || i._oldHits > 0) && i.type == C.WORK).length * C.REPAIR_POWER || 0,
        repairEnergyRemaining = object.energy / C.REPAIR_COST,
        repairHitsMax = target.hitsMax - target.hits,
        repairEffect = Math.min(repairPower, repairEnergyRemaining, repairHitsMax),
        repairCost = Math.min(object.energy, Math.ceil(repairEffect * C.REPAIR_COST)),
        boostedParts = _.map(object.body, i => {
            if(i.type == C.WORK && i.boost && C.BOOSTS[C.WORK][i.boost].repair > 0) {
                return (C.BOOSTS[C.WORK][i.boost].repair-1) * C.REPAIR_POWER;
            }
            return 0;
        });

    boostedParts.sort((a,b) => b-a);
    boostedParts = boostedParts.slice(0,repairEffect);

    var boostedEffect = Math.min(Math.floor(repairEffect + _.sum(boostedParts)), repairHitsMax);

    if(!boostedEffect) {
        return;
    }

    target.hits += boostedEffect;
    object.energy -= repairCost;

    stats.inc('energyConstruction', object.user, repairCost);

    if(target.hits > target.hitsMax) {
        target.hits = target.hitsMax;
    }

    object.actionLog.repair = {x: target.x, y: target.y};

    bulk.update(target, {hits: target.hits});
    bulk.update(object, {energy: object.energy});

    eventLog.push({event: C.EVENT_REPAIR, objectId: object._id, data: {
        targetId: target._id, amount: boostedEffect, energySpent: repairCost
    }});

};