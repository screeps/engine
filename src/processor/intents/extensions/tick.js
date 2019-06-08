var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, {bulk, roomController}) {

    if(!object || object.type != 'extension') return;

    if(roomController) {
        const storeCapacity = C.EXTENSION_ENERGY_CAPACITY[roomController.level] || 0;
        if(!object.storeCapacityResource ||
            !object.storeCapacityResource.energy ||
            storeCapacity != object.storeCapacityResource.energy) {
            bulk.update(object, {storeCapacityResource: {energy: storeCapacity}});
        }
    }


};
