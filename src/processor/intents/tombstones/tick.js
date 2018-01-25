var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, roomObjects, roomTerrain, bulk, bulkUsers, roomController, gameTime) {
    if(!object.decayTime || gameTime >= object.decayTime-1) {
        C.RESOURCES_ALL.forEach(resourceType => {
            if (object[resourceType] > 0) {
		var existingDrop = _.find(roomObjects, {type: 'energy', x: object.x, y: object.y, resourceType});
                if (existingDrop) {
                    bulk.update(existingDrop, {
                        [resourceType]: existingDrop[resourceType] + object[resourceType]
                    });
                } else {
                    bulk.insert({
                        type: 'energy',
                        x: object.x,
			y: object.y,
                        room: object.room,
                        [resourceType]: object[resourceType],
                        resourceType
                    })
                }
            }
        });

        bulk.remove(object._id);
        delete roomObjects[object._id];
    }
};
