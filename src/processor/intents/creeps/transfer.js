var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, eventLog}) {

    const resourceType = intent.resourceType;
    if(!_.contains(C.RESOURCES_ALL, resourceType)) {
        return;
    }
    if(!object || object.spawning || !object.store || !(object.store[resourceType] >= intent.amount) || intent.amount < 0) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type == 'creep' && target.spawning) {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }

    const targetCapacity = utils.capacityForResource(target, resourceType);

    if(!targetCapacity) {
        return;
    }

    let amount = intent.amount;

    const storedAmount = target.storeCapacityResource ? target.store[resourceType] : utils.calcResources(target);

    if(storedAmount >= targetCapacity) {
        return;
    }
    if(storedAmount + amount > targetCapacity) {
        amount = targetCapacity - storedAmount;
    }

    target.store[resourceType] = (target.store[resourceType] || 0) + amount;
    bulk.update(target, {store: {[resourceType]: target.store[resourceType]}});

    object.store[resourceType] -= amount;
    bulk.update(object, {store: {[resourceType]: object.store[resourceType]}});

    if(target.type == 'lab' && intent.resourceType != 'energy' && !target.storeCapacityResource[resourceType]) {
        bulk.update(target, {
            storeCapacityResource: {[resourceType]: C.LAB_MINERAL_CAPACITY},
            storeCapacity: null
        });
    }

    eventLog.push({event: C.EVENT_TRANSFER, objectId: object._id, data: {targetId: target._id, resourceType: resourceType, amount}});

};
