var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, {bulk, roomController, gameTime}) {

    if(!object || object.type != 'source') return;

    if(object.energy < object.energyCapacity) {

        if(!object.nextRegenerationTime) {
            object.nextRegenerationTime = gameTime + C.ENERGY_REGEN_TIME;
            bulk.update(object, {nextRegenerationTime: object.nextRegenerationTime});
        }
        if(gameTime >= object.nextRegenerationTime-1) {
            bulk.update(object, {
                nextRegenerationTime: null,
                energy: object.energyCapacity
            });
        }
    }

    if(roomController) {
        if (!roomController.user && !roomController.reservation && object.energyCapacity != C.SOURCE_ENERGY_NEUTRAL_CAPACITY) {
            bulk.update(object, {
                energyCapacity: C.SOURCE_ENERGY_NEUTRAL_CAPACITY,
                energy: Math.min(object.energy, C.SOURCE_ENERGY_NEUTRAL_CAPACITY)
            });
        }
        if ((roomController.user || roomController.reservation) && object.energyCapacity != C.SOURCE_ENERGY_CAPACITY) {
            bulk.update(object, {energyCapacity: C.SOURCE_ENERGY_CAPACITY});
        }
    }
    else if(object.energyCapacity != C.SOURCE_ENERGY_KEEPER_CAPACITY) {
        bulk.update(object, {energyCapacity: C.SOURCE_ENERGY_KEEPER_CAPACITY});
    }
};