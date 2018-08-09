var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, roomTerrain, bulk, roomController, stats}) {

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
                }, roomObjects, roomTerrain, bulk);
            }

            object.actionLog.harvest = {x: target.x, y: target.y};

            stats.inc('energyHarvested', object.user, amount);
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

            bulk.update(target, {mineralAmount: target.mineralAmount - amount});
            bulk.update(object, {[target.mineralType]: (object[target.mineralType] || 0)+amount});

            let sum = utils.calcResources(object);

            if (sum > object.energyCapacity) {
                require('./drop')(object, {
                    amount: Math.min(object[target.mineralType], sum - object.energyCapacity),
                    resourceType: target.mineralType
                }, roomObjects, roomTerrain, bulk);
            }

            object.actionLog.harvest = {x: target.x, y: target.y};

            extractor._cooldown = C.EXTRACTOR_COOLDOWN;
        }

    }
};