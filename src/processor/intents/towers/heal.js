var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, eventLog, gameTime}) {

    if(!object || object.type != 'tower' || !object.store) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'creep' && target.type !== 'powerCreep') {
        return;
    }
    if(target.spawning) {
        return;
    }
    if(object.store.energy < C.TOWER_ENERGY_COST) {
        return;
    }

    var range = Math.max(Math.abs(target.x - object.x), Math.abs(target.y - object.y));
    var amount = C.TOWER_POWER_HEAL;
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

    target._healToApply = (target._healToApply || 0) + amount;

    object.store.energy -= C.TOWER_ENERGY_COST;
    bulk.update(object, {store:{energy: object.store.energy}});

    object.actionLog.heal = {x: target.x, y: target.y};
    target.actionLog.healed = {x: object.x, y: object.y};

    eventLog.push({event: C.EVENT_HEAL, objectId: object._id, data: {targetId: target._id, amount: amount, healType: C.EVENT_HEAL_TYPE_RANGED}});

};
