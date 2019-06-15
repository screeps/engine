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
            object.energy += amount;

            let invaderHarvested = (target.invaderHarvested || 0) + amount;

            bulk.update(object, {energy: object.energy});
            bulk.update(target, {energy: target.energy, invaderHarvested});

            let sum = utils.calcResources(object);

            if (sum > object.energyCapacity) {
                require('./drop')(object, {
                    amount: Math.min(object.energy, sum - object.energyCapacity),
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
        if(extractor.off) {
            return;
        }
        if(extractor.cooldown) {
            return;
        }

        let harvestAmount = utils.calcBodyEffectiveness(object.body, C.WORK, 'harvest', C.HARVEST_MINERAL_POWER);

        if (harvestAmount) {

            let amount = Math.min(target.mineralAmount, harvestAmount);

            bulk.update(target, {mineralAmount: target.mineralAmount - amount});
            bulk.update(object, {[target.mineralType]: (object[target.mineralType] || 0)+amount});

            let sum = utils.calcResources(object);

            if (sum > object.energyCapacity) {
                require('./drop')(object, {
                    amount: Math.min(object[target.mineralType], sum - object.energyCapacity),
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
        bulk.update(object, {[target.depositType]: (object[target.depositType] || 0)+amount});

        let sum = utils.calcResources(object);

        if (sum > object.energyCapacity) {
            require('./drop')(object, {
                amount: Math.min(object[target.depositType], sum - object.energyCapacity),
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
