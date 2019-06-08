var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {

    const {roomObjects, roomTerrain, bulk, roomController, stats, eventLog, gameTime} = scope;

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target) {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }

    if(target.type == 'source') {

        if (!target.energy) {
            return;
        }

        if (roomController && (roomController.user && roomController.user != object.user || roomController.reservation && roomController.reservation.user != object.user)) {
            return;
        }

        let harvestAmount = utils.calcBodyEffectiveness(object.body, C.WORK, 'harvest', C.HARVEST_POWER);

        if (harvestAmount) {

            let amount = Math.min(target.energy, harvestAmount);

            target.energy -= amount;
            object.store = object.store || {};
            object.store.energy = (object.store.energy || 0) + amount;

            let invaderHarvested = (target.invaderHarvested || 0) + amount;

            bulk.update(object, {store:{energy: object.store.energy}});
            bulk.update(target, {energy: target.energy, invaderHarvested});

            let sum = utils.calcResources(object);

            if (sum > object.storeCapacity) {
                require('./drop')(object, {
                    amount: Math.min(object.store.energy, sum - object.storeCapacity),
                    resourceType: 'energy'
                }, scope);
            }

            object.actionLog.harvest = {x: target.x, y: target.y};

            stats.inc('energyHarvested', object.user, amount);

            eventLog.push({event: C.EVENT_HARVEST, objectId: object._id, data: {targetId: target._id, amount}});
        }
    }

    if(target.type == 'mineral') {

        if(!target.mineralAmount) {
            return;
        }

        var extractor = _.find(roomObjects, i => i.type == C.STRUCTURE_EXTRACTOR && i.x == target.x && i.y == target.y);

        if(!extractor) {
            return;
        }
        if(extractor.user && extractor.user != object.user) {
            return;
        }
        if(!utils.checkStructureAgainstController(extractor, roomObjects, roomController)) {
            return;
        }
        if(extractor.cooldown) {
            return;
        }

        let harvestAmount = utils.calcBodyEffectiveness(object.body, C.WORK, 'harvest', C.HARVEST_MINERAL_POWER);

        if (harvestAmount) {

            let amount = Math.min(target.mineralAmount, harvestAmount);
            object.store = object.store || {};
            bulk.update(target, {mineralAmount: target.mineralAmount - amount});
            bulk.update(object, {store: {[target.mineralType]: (object.store[target.mineralType] || 0)+amount}});

            let sum = utils.calcResources(object);

            if (sum > object.storeCapacity) {
                require('./drop')(object, {
                    amount: Math.min(object.store[target.mineralType], sum - object.storeCapacity),
                    resourceType: target.mineralType
                }, scope);
            }

            object.actionLog.harvest = {x: target.x, y: target.y};

            extractor._cooldown = C.EXTRACTOR_COOLDOWN;

            eventLog.push({event: C.EVENT_HARVEST, objectId: object._id, data: {targetId: target._id, amount: harvestAmount}});
        }
    }

    if(target.type == 'deposit') {
        if(target.cooldownTime && target.cooldownTime > gameTime) {
            return;
        }

        const amount = utils.calcBodyEffectiveness(object.body, C.WORK, 'harvest', C.HARVEST_DEPOSIT_POWER);
        bulk.update(object, {store: {[target.depositType]: (object.store[target.depositType] || 0)+amount}});

        let sum = utils.calcResources(object);

        if (sum > object.storeCapacity) {
            require('./drop')(object, {
                amount: Math.min(object.store[target.depositType], sum - object.storeCapacity),
                resourceType: target.depositType
            }, scope);
        }

        object.actionLog.harvest = {x: target.x, y: target.y};

        bulk.inc(target, 'harvested', amount);
        const cooldown = Math.ceil(C.DEPOSIT_EXHAUST_MULTIPLY*Math.pow(target.harvested,C.DEPOSIT_EXHAUST_POW));
        if(cooldown > 1) {
            target._cooldown = cooldown;
        }
        bulk.update(target, {decayTime: C.DEPOSIT_DECAY_TIME + gameTime});
    }
};
