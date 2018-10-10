var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, scope) {
    if(!object || object.type != 'invaderCore') return;

    const {roomObjects, bulk, gameTime} = scope;

    if(object.nextDecayTime && gameTime >= object.nextDecayTime) {
        const existingStructures = _.filter(roomObjects, {coreId: object._id});
        existingStructures.forEach(s => bulk.remove(s._id));
        bulk.remove(object._id);
        delete roomObjects[object._id];
        return;
    }
};
