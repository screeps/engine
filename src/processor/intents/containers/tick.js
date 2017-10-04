var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, roomObjects, roomTerrain, bulk, bulkUsers, roomController, gameTime) {

    if(!object.nextDecayTime || gameTime >= object.nextDecayTime-1) {
        object.hits = object.hits || 0;
        object.hits -= C.CONTAINER_DECAY;
        if(object.hits <= 0) {

            C.RESOURCES_ALL.forEach(resourceType => {
                if (object[resourceType] > 0) {
                    require('../creeps/_create-energy')(object.x, object.y, object.room,
                    object[resourceType], roomObjects, bulk, resourceType);
                }
            });

            bulk.remove(object._id);
            delete roomObjects[object._id];
        }
        else {
            object.nextDecayTime = gameTime + (roomController && roomController.level > 0 ? C.CONTAINER_DECAY_TIME_OWNED : C.CONTAINER_DECAY_TIME);
            bulk.update(object, {
                hits: object.hits,
                nextDecayTime: object.nextDecayTime
            });
        }
    }


};