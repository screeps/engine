var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, roomObjects, roomTerrain, bulk, bulkUsers, roomController, gameTime) {

    if(!object.mineralAmount) {

        if(!object.nextRegenerationTime) {
            object.nextRegenerationTime = gameTime + C.MINERAL_REGEN_TIME;
            bulk.update(object, {nextRegenerationTime: object.nextRegenerationTime});
        }
        if(gameTime >= object.nextRegenerationTime-1) {
            var update = {
                nextRegenerationTime: null,
                mineralAmount: C.MINERAL_DENSITY[object.density]
            };
            if(object.density == C.DENSITY_LOW || object.density == C.DENSITY_ULTRA ||
                Math.random() < C.MINERAL_DENSITY_CHANGE) {
                var oldDensity = object.density, newDensity;
                do {
                    var random = Math.random();
                    for (var density in C.MINERAL_DENSITY_PROBABILITY) {
                        if (random <= C.MINERAL_DENSITY_PROBABILITY[density]) {
                            newDensity = +density;
                            break;
                        }
                    }
                }
                while(newDensity == oldDensity);

                update.density = object.density = newDensity;
            }
            bulk.update(object, update);
        }
    }

};