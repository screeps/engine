var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;


module.exports = function(spawn, roomObjects, cost, bulk, energyStructures) {

    var spawns = [];
    var extensions = [];

    if(energyStructures) {
        _.forEach(energyStructures, id => {
            let energyStructure = roomObjects[id];
            if(!energyStructure || energyStructure.off || energyStructure.user !== spawn.user) {
                return;
            }

            if(energyStructure.type === 'spawn'){
                spawns.push(energyStructure);
            } else if(energyStructure.type === 'extension'){
                extensions.push(energyStructure);
            }
        });
    } else {
        spawns = _.filter(roomObjects, i => i.type == 'spawn' && i.user == spawn.user && !i.off);
        extensions = _.filter(roomObjects, i => i.type == 'extension' && i.user == spawn.user && !i.off);
    }

    var availableEnergy = _.sum(extensions, 'energy') + _.sum(spawns, 'energy');

    if(availableEnergy < cost) {
        return false;
    }

    if(energyStructures === undefined) {
        spawns.sort(utils.comparatorDistance(spawn));
    }

    spawns.forEach((i) => {
        var neededEnergy = Math.min(cost, i.energy);
        i.energy -= neededEnergy;
        cost -= neededEnergy;
        bulk.update(i, {energy: i.energy});
    });

    if(cost <= 0) {
        return true;
    }

    if(energyStructures === undefined) {
        extensions.sort(utils.comparatorDistance(spawn));
    }

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
};
