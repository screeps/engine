var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, stats, eventLog, gameTime}) {

    if(object.type != 'tower') {
        return;
    }
    if(object.spawning) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || !C.CONSTRUCTION_COST[target.type] || target.hits >= target.hitsMax) {
        return;
    }
    if(object.energy < C.TOWER_ENERGY_COST) {
        return;
    }

    var range = Math.max(Math.abs(target.x - object.x), Math.abs(target.y - object.y));
    var amount = C.TOWER_POWER_REPAIR;
    if(range > C.TOWER_OPTIMAL_RANGE) {
        if(range > C.TOWER_FALLOFF_RANGE) {
            range = C.TOWER_FALLOFF_RANGE;
        }
        amount -= amount * C.TOWER_FALLOFF * (range - C.TOWER_OPTIMAL_RANGE) / (C.TOWER_FALLOFF_RANGE - C.TOWER_OPTIMAL_RANGE);
    }
    [C.PWR_OPERATE_TOWER, C.PWR_DISRUPT_TOWER].forEach(power => {
        var effect = _.find(object.effects, {power});
        if(effect && effect.endTime > gameTime) {
            amount *= C.POWER_INFO[power].effect[effect.level-1];
        }
    });
    amount = Math.floor(amount);

    if(!amount) {
        return;
    }

    target.hits += amount;
    if(target.hits > target.hitsMax) {
        target.hits = target.hitsMax;
    }
    bulk.update(target, {hits: target.hits});

    object.energy -= C.TOWER_ENERGY_COST;
    object.actionLog.repair = {x: target.x, y: target.y};
    bulk.update(object, {energy: object.energy});

    stats.inc('energyConstruction', object.user, C.TOWER_ENERGY_COST);

    eventLog.push({event: C.EVENT_REPAIR, objectId: object._id, data: {
        targetId: target._id, amount: amount, energySpent: C.TOWER_ENERGY_COST
    }});

};