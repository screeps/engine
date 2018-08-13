var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, eventLog}) {

    if(object.type != 'tower') {
        return;
    }
    if(object.spawning) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'creep') {
        return;
    }
    if(target.spawning) {
        return;
    }
    if(object.energy < C.TOWER_ENERGY_COST) {
        return;
    }

    var range = Math.max(Math.abs(target.x - object.x), Math.abs(target.y - object.y));
    var effect = C.TOWER_POWER_HEAL;
    if(range > C.TOWER_OPTIMAL_RANGE) {
        if(range > C.TOWER_FALLOFF_RANGE) {
            range = C.TOWER_FALLOFF_RANGE;
        }
        effect -= effect * C.TOWER_FALLOFF * (range - C.TOWER_OPTIMAL_RANGE) / (C.TOWER_FALLOFF_RANGE - C.TOWER_OPTIMAL_RANGE);
    }
    effect = Math.floor(effect);

    if(!effect) {
        return;
    }

    target._healToApply = (target._healToApply || 0) + effect;

    object.energy -= C.TOWER_ENERGY_COST;
    bulk.update(object, {energy: object.energy});

    object.actionLog.heal = {x: target.x, y: target.y};
    target.actionLog.healed = {x: object.x, y: object.y};

    eventLog.push({event: C.EVENT_HEAL, objectId: object._id, data: {targetId: target._id, amount: effect, healType: EVENT_HEAL_TYPE_RANGED}});

};