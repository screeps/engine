var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk}) {

    if(!_.contains(C.RESOURCES_ALL, intent.resourceType)) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'creep' || target.spawning || utils.calcResources(target) >= target.energyCapacity || intent.amount < 0) {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }
    var amount = intent.amount;
    if(utils.calcResources(target) + amount > target.energyCapacity) {
        amount = target.energyCapacity - utils.calcResources(target);
    }
    if(!(object[intent.resourceType] >= amount)) {
        return;
    }

    target[intent.resourceType] = target[intent.resourceType] || 0;
    target[intent.resourceType] += amount;
    object[intent.resourceType] -= amount;

    bulk.update(object, {[intent.resourceType]: object[intent.resourceType]});
    bulk.update(target, {[intent.resourceType]: target[intent.resourceType]});
};
