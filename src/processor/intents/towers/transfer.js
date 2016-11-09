var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk, bulkUsers, roomController) {

    if(object.type != 'tower') {
        return;
    }

    if(object.energy < intent.amount || intent.amount < 0) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target) {
        return;
    }

    if(target.type != 'creep') {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }
    if(target.energy == target.energyCapacity) {
        return;
    }

    var amount = intent.amount;
    if(target.energy + amount > target.energyCapacity) {
        amount = target.energyCapacity - target.energy;
    }

    target.energy += amount;
    object.energy -= amount;

    bulk.update(object, {energy: object.energy});
    bulk.update(target, {energy: target.energy});
};