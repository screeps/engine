var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, eventLog}) {

    if(!_.contains(C.RESOURCES_ALL, intent.resourceType)) {
        return;
    }
    if(object.spawning || !(object[intent.resourceType] >= intent.amount) || intent.amount < 0) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type == 'creep' && target.spawning) {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }

    if(intent.resourceType == 'energy') {
        if(!_.contains(['spawn','creep','powerCreep','extension','link','storage','tower','powerSpawn','lab','terminal','container','nuker'], target.type)) {
            return;
        }
    }
    else if(intent.resourceType == 'power') {
        if(!_.contains(['creep','powerCreep','storage','powerSpawn','terminal','container'], target.type)) {
            return;
        }

    }
    else {
        if(!_.contains(['creep','powerCreep','storage','lab','terminal','container','nuker'], target.type)) {
            return;
        }
    }

    var amount = intent.amount;

    if(target.type == 'lab') {
        if(intent.resourceType != C.RESOURCE_ENERGY && target.mineralType && target.mineralType != intent.resourceType) {
            return;
        }

        var targetCapacityKey = intent.resourceType == C.RESOURCE_ENERGY ? 'energyCapacity' : 'mineralCapacity';
        var targetAmountKey = intent.resourceType == C.RESOURCE_ENERGY ? 'energy' : 'mineralAmount';

        if(target[targetAmountKey] >= target[targetCapacityKey]) {
            return;
        }
        if(target[targetAmountKey] + amount > target[targetCapacityKey]) {
            amount = target[targetCapacityKey] - target[targetAmountKey];
        }

        target[targetAmountKey] += amount;
        bulk.update(target, {[targetAmountKey]: target[targetAmountKey]});

        if(target.mineralAmount && !target.mineralType) {
            bulk.update(target, {mineralType: intent.resourceType});
        }
    }
    else {
        if (target.type == 'powerSpawn') {
            if (target[intent.resourceType] >= target[intent.resourceType + 'Capacity']) {
                return;
            }
            if (target[intent.resourceType] + amount > target[intent.resourceType + 'Capacity']) {
                amount = target[intent.resourceType + 'Capacity'] - target[intent.resourceType];
            }
        }
        else  if (target.type == 'nuker') {
            if(intent.resourceType != C.RESOURCE_ENERGY && intent.resourceType != C.RESOURCE_GHODIUM) {
                return;
            }
            if (target[intent.resourceType] >= target[intent.resourceType + 'Capacity']) {
                return;
            }
            if (target[intent.resourceType] + amount > target[intent.resourceType + 'Capacity']) {
                amount = target[intent.resourceType + 'Capacity'] - target[intent.resourceType];
            }
        }
        else {
            var targetTotal = utils.calcResources(target);
            if (targetTotal >= target.energyCapacity) {
                return;
            }
            if (targetTotal + amount > target.energyCapacity) {
                amount = target.energyCapacity - targetTotal;
            }
        }

        target[intent.resourceType] = target[intent.resourceType] || 0;
        target[intent.resourceType] += amount;
        bulk.update(target, {[intent.resourceType]: target[intent.resourceType]});
    }

    object[intent.resourceType] -= amount;

    bulk.update(object, {[intent.resourceType]: object[intent.resourceType]});

    eventLog.push({event: C.EVENT_TRANSFER, objectId: object._id, data: {targetId: target._id, resourceType: intent.resourceType, amount}});

};
