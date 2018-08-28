var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, {roomObjects, bulk}) {

    if(!object || object.type != 'energy') return;

    var resourceType = object.resourceType || 'energy';

    object[resourceType] -= Math.ceil(object[resourceType] / C.ENERGY_DECAY);

    if (object[resourceType] <= 0 || !object[resourceType]) {
        if (_.isNaN(object[resourceType])) {
            console.log("Energy NaN: dropped");
        }
        bulk.remove(object._id);
        delete roomObjects[object._id];
    }
    else {
        bulk.update(object, {[resourceType]: object[resourceType]});
    }
};