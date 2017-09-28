var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

function oldEnergyHandling(spawn, roomObjects, cost, bulk){
    var spawns = _.filter(roomObjects, i => i.type == 'spawn' && i.user == spawn.user && !i.off);
    var extensions = _.filter(roomObjects, i => i.type == 'extension' && i.user == spawn.user && !i.off);
    var availableEnergy = _.sum(extensions, 'energy') + _.sum(spawns, 'energy');

    if(availableEnergy < cost) {
        return false;
    }

    spawns.sort(utils.comparatorDistance(spawn));
    spawns.forEach((i) => {
        var neededEnergy = Math.min(cost, i.energy);
        i.energy -= neededEnergy;
        cost -= neededEnergy;
        bulk.update(i, {energy: i.energy});
    });

    if(cost <= 0) {
        return true;
    }

    extensions.sort(utils.comparatorDistance(spawn));
    extensions.forEach((extension) => {
        if(cost <= 0) {
            return;
        }
        var neededEnergy = Math.min(cost, extension.energy);
        extension.energy -= neededEnergy;
        cost -= neededEnergy;
        bulk.update(extension, {energy: extension.energy});
    });

    return true;
}

function newEnergyHandling(spawn, roomObjects, cost, bulk, energyStructures){
    energyStructures = _.filter(energyStructures, id => {
        let energyStructure = roomObjects[id];

        return energyStructure && !energyStructure.off && energyStructure.user === spawn.user &&
            (energyStructure.type === 'spawn' || energyStructure.type === 'extension');
    });

    energyStructures = _.uniq(energyStructures);

    let availableEnergy = _.sum(energyStructures, id => roomObjects[id].energy);
    if(availableEnergy < cost) {
        return false;
    }

    _.forEach(energyStructures, id => {
        let energyStructure = roomObjects[id];

        let energyChange = Math.min(cost, energyStructure.energy);
        energyStructure.energy -= energyChange;
        bulk.update(energyStructure, {energy: energyStructure.energy});

        cost -= energyChange;
        if(cost <= 0) {
            return false;
        }
    });

    return true;
}

module.exports = function chargeEnergy(spawn, roomObjects, cost, bulk, energyStructures) {
    if(energyStructures === undefined) {
        return oldEnergyHandling(spawn, roomObjects, cost, bulk);
    } else {
        return newEnergyHandling(spawn, roomObjects, cost, bulk, energyStructures);
    }
};
