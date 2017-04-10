var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;


module.exports = function(spawn, roomObjects, cost, bulk, roomController) {

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
};
