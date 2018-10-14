var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, scope) {
    if(!object || object.type != 'invaderCore') return;

    const {roomObjects, bulk, gameTime} = scope;

    if(object.nextDecayTime && gameTime >= object.nextDecayTime) {
        const existingStructures = _.filter(roomObjects, {strongholdId: object.strongholdId});
        existingStructures.forEach(s => {bulk.remove(s._id); delete roomObjects[s._id]});
        return;
    }
};
