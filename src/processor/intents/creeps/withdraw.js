var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime) {

    if(!_.contains(C.RESOURCES_ALL, intent.resourceType)) {
        return;
    }

    var totalResources = utils.calcResources(object);
    var emptySpace = object.energyCapacity - totalResources;
    var amount = Math.min(intent.amount, emptySpace);

    if(object.spawning || amount < 0) {
        return;
    }
    if(roomController && roomController.user != object.user && roomController.safeMode > gameTime) {
        return;
    }
    var target = roomObjects[intent.id];
    if(!target) {
        return;
    }
    if(object.user != target.user && _.any(roomObjects, i => i.type == C.STRUCTURE_RAMPART && i.user != object.user && !i.isPublic)) {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }

    if(intent.resourceType == 'energy') {
        if(!_.contains(['spawn','creep','extension','link','storage','tower','powerSpawn','lab','terminal','container'], target.type)) {
            return;
        }
    }
    else if(intent.resourceType == 'power') {
        if(!_.contains(['creep','storage','powerSpawn','terminal','container'], target.type)) {
            return;
        }

    }
    else {
        if(!_.contains(['creep','storage','lab','terminal','container'], target.type)) {
            return;
        }
    }



    if(target.type == 'lab') {
        if(intent.resourceType != C.RESOURCE_ENERGY && intent.resourceType != target.mineralType) {
            return;
        }

        var targetCapacityKey = intent.resourceType == C.RESOURCE_ENERGY ? 'energyCapacity' : 'mineralCapacity';
        var targetAmountKey = intent.resourceType == C.RESOURCE_ENERGY ? 'energy' : 'mineralAmount';

        if(amount > target[targetAmountKey]) {
            amount = target[targetAmountKey];
        }

        target[targetAmountKey] -= amount;
        bulk.update(target, {[targetAmountKey]: target[targetAmountKey]});

        if(!target.mineralAmount && target.mineralType) {
            bulk.update(target, {mineralType: null});
        }
    }
    else {
        if (amount > target[intent.resourceType]) {
            amount = target[intent.resourceType];
        }

        target[intent.resourceType] -= amount;
        bulk.update(target, {[intent.resourceType]: target[intent.resourceType]});
    }

    object[intent.resourceType] = object[intent.resourceType] || 0;
    object[intent.resourceType] += amount;

    bulk.update(object, {[intent.resourceType]: object[intent.resourceType]});



};