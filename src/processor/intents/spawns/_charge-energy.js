var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

function oldEnergyHandling(spawn, cost, {roomObjects, bulk}){
    var spawns = _.filter(roomObjects, i => i.type == 'spawn' && i.user == spawn.user && !i.off);
    var extensions = _.filter(roomObjects, i => i.type == 'extension' && i.user == spawn.user && !i.off);
    var availableEnergy = _.sumBy(extensions, 'store.energy') + _.sumBy(spawns, 'store.energy');

    if(availableEnergy < cost) {
        return false;
    }

    spawns.sort(utils.comparatorDistance(spawn));
    spawns.forEach((i) => {
        var neededEnergy = Math.min(cost, i.store.energy);
        i.store.energy -= neededEnergy;
        cost -= neededEnergy;
        bulk.update(i, {store:{energy: i.store.energy}});
    });

    if(cost <= 0) {
        return true;
    }

    extensions.sort(utils.comparatorDistance(spawn));
    extensions.forEach((extension) => {
        if(cost <= 0) {
            return;
        }
        var neededEnergy = Math.min(cost, extension.store.energy);
        extension.store.energy -= neededEnergy;
        cost -= neededEnergy;
        bulk.update(extension, {store:{energy: extension.store.energy}});
    });

    return true;
}

function newEnergyHandling(spawn, cost, energyStructures, {roomObjects, bulk}){
    energyStructures = _.filter(energyStructures, id => {
        let energyStructure = roomObjects[id];

        return energyStructure && !energyStructure.off && energyStructure.user === spawn.user &&
            (energyStructure.type === 'spawn' || energyStructure.type === 'extension');
    });

    energyStructures = _.uniq(energyStructures);

    let availableEnergy = _.sumBy(energyStructures, id => roomObjects[id].store.energy);
    if(availableEnergy < cost) {
        return false;
    }

    _.forEach(energyStructures, id => {
        let energyStructure = roomObjects[id];

        let energyChange = Math.min(cost, energyStructure.store.energy);
        energyStructure.store.energy -= energyChange;
        bulk.update(energyStructure, {store:{energy: energyStructure.store.energy}});

        cost -= energyChange;
        if(cost <= 0) {
            return false;
        }
    });

    return true;
}

module.exports = function chargeEnergy(spawn, cost, energyStructures, scope) {
    if(energyStructures === undefined) {
        return oldEnergyHandling(spawn, cost, scope);
    } else {
        return newEnergyHandling(spawn, cost, energyStructures, scope);
    }
};
