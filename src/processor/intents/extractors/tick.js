var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

module.exports = function(object, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats) {

    if(object.cooldown > 0) {

        object.cooldown--;

        if(object.cooldown < 0)
            object.cooldown = 0;

        bulk.update(object, {
            cooldown: object.cooldown
        });
    }

    if(object._cooldown) {
        bulk.update(object, {
            cooldown: object._cooldown
        });
    }

};