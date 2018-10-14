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
    const targetTotal = target.type == 'creep' ? utils.calcResources(target) : target.energy;
    if(targetTotal == target.energyCapacity) {
        return;
    }

    var amount = intent.amount;
    if(targetTotal + amount > target.energyCapacity) {
        amount = target.energyCapacity - targetTotal;
    }

    target.energy += amount;

    object.actionLog.transferEnergy = {x: target.x, y: target.y};

    bulk.update(object, {actionLog: object.actionLog});
    bulk.update(target, {energy: target.energy});

    eventLog.push({event: C.EVENT_TRANSFER, objectId: object._id, data: {targetId: target._id, resourceType: C.RESOURCE_ENERGY, amount}});
};
