const _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function (object, {roomObjects, bulk, gameTime}) {
    if (!object.decayTime || gameTime >= object.decayTime - 1) {

        if(object.store) {
            _.forEach(object.store, (amount, resourceType)=>{
                if (amount > 0) {
                    var existingDrop = _.find(roomObjects, {type: 'energy', x: object.x, y: object.y, resourceType});
                    if (existingDrop) {
                        bulk.update(existingDrop, {
                            [resourceType]: existingDrop[resourceType] + amount
                        });
                    } else {
                        bulk.insert({
                            type: 'energy',
                            x: object.x,
                            y: object.y,
                            room: object.room,
                            [resourceType]: amount,
                            resourceType
                        })
                    }
                }
            });
        }

        bulk.remove(object._id);
        delete roomObjects[object._id];
    }
};
