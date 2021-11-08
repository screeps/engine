var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, {roomObjects, roomTerrain, bulk, gameTime}) {

    if(!object || object.type != 'road') return;

    if(!object.nextDecayTime || gameTime >= object.nextDecayTime-1) {
        var decayAmount = C.ROAD_DECAY_AMOUNT;
        if(_.some(roomObjects, (i) => i.x == object.x && i.y == object.y && i.type == 'swamp') ||
            utils.checkTerrain(roomTerrain, object.x, object.y, C.TERRAIN_MASK_SWAMP)) {
            decayAmount *= C.CONSTRUCTION_COST_ROAD_SWAMP_RATIO;
        }
        if(_.some(roomObjects, (i) => i.x == object.x && i.y == object.y && i.type == 'wall') ||
            utils.checkTerrain(roomTerrain, object.x, object.y, C.TERRAIN_MASK_WALL)) {
            decayAmount *= C.CONSTRUCTION_COST_ROAD_WALL_RATIO;
        }
        object.hits -= decayAmount;
        if(object.hits <= 0) {
            bulk.remove(object._id);
            delete roomObjects[object._id];
        }
        else {
            object.nextDecayTime = gameTime + C.ROAD_DECAY_TIME;
            bulk.update(object, {
                hits: object.hits,
                nextDecayTime: object.nextDecayTime
            });
        }
    }


};