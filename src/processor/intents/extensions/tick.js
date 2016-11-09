var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, roomObjects, roomTerrain, bulk, bulkUsers, roomController, gameTime) {

    if(!object || object.type != 'extension') return;

    if(roomController) {
        var energyCapacity = C.EXTENSION_ENERGY_CAPACITY[roomController.level] || 0;
        if(energyCapacity != object.energyCapacity) {
            bulk.update(object, {energyCapacity});
        }
    }


};