var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {

    const {roomObjects, roomTerrain, bulk, roomController, gameTime} = scope;

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || !C.CONSTRUCTION_COST[target.type]) {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }
    if(roomController && roomController.user != object.user && roomController.safeMode > gameTime) {
        return;
    }
    var rampart = _.find(roomObjects, {type: 'rampart', x: target.x, y: target.y});
    if(rampart) {
        target = rampart;
    }


    var power = utils.calcBodyEffectiveness(object.body, C.WORK, 'dismantle', C.DISMANTLE_POWER),
    amount = Math.min(power, target.hits),
    energyGain = Math.floor(amount * C.DISMANTLE_COST);

    var effect = _.find(target.effects, {power: C.PWR_SHIELD});
    if(effect && effect.endTime >= gameTime) {
        energyGain = 0;
    }

    if(amount) {

        object.energy += energyGain;
        bulk.update(object, {energy: object.energy});

        if (object.energy > object.energyCapacity) {
            require('./drop')(object, {amount: object.energy - object.energyCapacity, resourceType: 'energy'}, scope);
        }

        require('../_damage')(object, target, amount, C.EVENT_ATTACK_TYPE_DISMANTLE, scope);
    }
};