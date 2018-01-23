var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, roomObjects, roomTerrain, bulk, bulkUsers, roomController, gameTime) {
    if(!object.decayTime || gameTime >= object.decayTime-1) {
        C.RESOURCES_ALL.forEach(resourceType => {
            if (object[resourceType] > 0) {
                require('../creeps/_create-energy')(object.x, object.y, object.room,
                    object[resourceType], roomObjects, bulk, resourceType);
            }
        });

        bulk.remove(object._id);
        delete roomObjects[object._id];
    }
};