var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, roomController, eventLog}) {

    if(!object || object.type != 'link') {
        return;
    }

    if(!object.store || object.store.energy < intent.amount || intent.amount < 0) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target) {
        return;
    }

    if(target.type != 'link') {
        return;
    }
    var amount = intent.amount;
    var targetTotal;

    if(object.cooldown > 0) {
        return;
    }
    if(!utils.checkStructureAgainstController(object, roomObjects, roomController)) {
        return;
    }
    targetTotal = target.store.energy;

    if(!target.storeCapacityResource || !target.storeCapacityResource.energy || targetTotal == target.storeCapacityResource.energy) {
        return;
    }

    if(targetTotal + amount > target.storeCapacityResource.energy) {
        amount = target.storeCapacityResource.energy - targetTotal;
    }
    target.store.energy += amount;

    object.store.energy -= amount;

    target.store.energy -= Math.ceil(amount * C.LINK_LOSS_RATIO);
    object.cooldown += C.LINK_COOLDOWN * Math.max(Math.abs(target.x - object.x), Math.abs(target.y - object.y));
    object.actionLog.transferEnergy = {x: target.x, y: target.y};
    bulk.update(target, {store:{energy: target.store.energy}});

    bulk.update(object, {store:{energy: object.store.energy}, cooldown: object.cooldown, actionLog: object.actionLog});

    eventLog.push({event: C.EVENT_TRANSFER, objectId: object._id, data: {targetId: target._id, resourceType: C.RESOURCE_ENERGY, amount}});
};
