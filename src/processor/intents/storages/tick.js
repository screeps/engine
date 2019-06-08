var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, {bulk, roomController, gameTime}) {
    if (roomController) {
        var storeCapacity = roomController.level > 0 && roomController.user == object.user && C.CONTROLLER_STRUCTURES.storage[roomController.level] > 0 ? C.STORAGE_CAPACITY : 0;
        if(storeCapacity > 0) {
            var effect = _.find(object.effects, {power: C.PWR_OPERATE_STORAGE});
            if (effect && effect.endTime > gameTime) {
                storeCapacity += C.POWER_INFO[C.PWR_OPERATE_STORAGE].effect[effect.level-1];
            }
        }
        if (storeCapacity != object.storeCapacity) {
            bulk.update(object, {storeCapacity});
        }
    }
};
