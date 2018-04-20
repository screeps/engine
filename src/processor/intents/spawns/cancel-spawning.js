var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(spawn, intent, roomObjects, roomTerrain, bulk) {
    if(spawn.type != 'spawn' || !spawn.spawning)
        return;
    var spawningCreep = _.find(roomObjects, {type: 'creep', name: spawn.spawning.name, x: spawn.x, y: spawn.y});
    bulk.remove(spawningCreep._id);
    delete roomObjects[spawningCreep._id];
    bulk.update(spawn, {spawning: null});
};