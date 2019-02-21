var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {

    let {roomObjects, bulk, roomController, gameTime} = scope;

    if(object.type != 'tower') {
        return;
    }
    if(object.spawning) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target == object) {
        return;
    }
    if(target.type == 'creep' && target.spawning) {
        return;
    }
    if(!target.hits) {
        return;
    }
    if(object.energy < C.TOWER_ENERGY_COST) {
        return;
    }
    var rampart = _.find(roomObjects, {type: 'rampart', x: target.x, y: target.y});
    if(rampart) {
        target = rampart;
    }

    var range = Math.max(Math.abs(target.x - object.x), Math.abs(target.y - object.y));
    var amount = C.TOWER_POWER_ATTACK;
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

    require('../_damage')(object, target, amount, C.EVENT_ATTACK_TYPE_RANGED, scope);

    object.energy -= C.TOWER_ENERGY_COST;
    bulk.update(object, {energy: object.energy});


    object.actionLog.attack = {x: target.x, y: target.y};
    if(target.actionLog) {
        target.actionLog.attacked = {x: object.x, y: object.y};
    }

    if(target.notifyWhenAttacked) {
        utils.sendAttackingNotification(target, roomController);
    }




};