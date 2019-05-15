const _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;;

module.exports = function(object, {roomController,bulk}) {
    if(roomController) {
        var energyCapacity = roomController.level > 0 && roomController.user == object.user && C.CONTROLLER_STRUCTURES.factory[roomController.level] ? C.FACTORY_CAPACITY : 0;
        if(energyCapacity != object.energyCapacity) {
            bulk.update(object, {energyCapacity});
        }
    }

    if(!_.isEqual(object._actionLog, object.actionLog)) {
        bulk.update(object, {
            actionLog: object.actionLog
        });
    }
};
