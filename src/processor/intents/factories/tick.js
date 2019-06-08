const _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;;

module.exports = function(object, {roomController,bulk}) {
    if(roomController) {
        const storeCapacity = roomController.level > 0 && roomController.user == object.user && C.CONTROLLER_STRUCTURES.factory[roomController.level] ? C.FACTORY_CAPACITY : 0;
        if(storeCapacity != object.storeCapacity) {
            bulk.update(object, {storeCapacity});
        }
    }

    if(!_.isEqual(object._actionLog, object.actionLog)) {
        bulk.update(object, {
            actionLog: object.actionLog
        });
    }
};
