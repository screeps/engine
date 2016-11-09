var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk) {

    if(object.type != 'spawn') {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'creep' || target.energy >= target.energyCapacity || intent.amount < 0) {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }
    var amount = intent.amount;
    if(target.energy + amount > target.energyCapacity) {
        amount = target.energyCapacity - target.energy;
    }
    if(object.energy < amount) {
        return;
    }

    target.energy += amount;
    object.energy -= amount;

    bulk.update(object, {energy: object.energy});
    bulk.update(target, {energy: target.energy});
};