var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, {roomObjects, bulk, gameTime}) {
    if(object.decayTime && gameTime > object.decayTime) {
        bulk.remove(object._id);
        delete roomObjects[object._id];
    }
};
