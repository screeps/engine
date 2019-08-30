var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, roomController, eventLog}) {
    if(object.type != 'invaderCore') {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target) {
        return;
    }

    if(!_.contains(['tower','creep'], target.type)) {
        return;
    }
    const targetTotal = target.type == 'creep' ? utils.calcResources(target) : target.store.energy;
    const targetCapacity = target.storeCapacity || target.storeCapacityResource.energy;
    if(targetTotal == targetCapacity) {
        return;
    }

    var amount = intent.amount;
    if(targetTotal + amount > targetCapacity) {
        amount = targetCapacity - targetTotal;
    }

    target.store.energy += amount;

    object.actionLog.transferEnergy = {x: target.x, y: target.y};

    bulk.update(object, {actionLog: object.actionLog});
    bulk.update(target, { store: { energy: target.store.energy }});

    eventLog.push({event: C.EVENT_TRANSFER, objectId: object._id, data: {targetId: target._id, resourceType: C.RESOURCE_ENERGY, amount}});
};
