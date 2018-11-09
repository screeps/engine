var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;


module.exports = function(object, intent, {roomObjects, bulk, bulkUsers, roomController, stats}) {

    if(object.type != 'powerSpawn')
        return;

    if(object.off) {
        return;
    }

    if(!object.power || object.energy < C.POWER_SPAWN_ENERGY_RATIO) {
        return;
    }

    object.power--;
    object.energy -= C.POWER_SPAWN_ENERGY_RATIO;

    stats.inc('powerProcessed', object.user, 1);

    bulk.update(object, {
        energy: object.energy,
        power: object.power
    });

    if(bulkUsers.inc) {
        bulkUsers.inc(object.user, 'power', 1);
    }
};