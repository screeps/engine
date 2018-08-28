var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, {bulk, roomController}) {

    if(roomController) {
        var energyCapacity = roomController.level > 0 && roomController.user == object.user && C.CONTROLLER_STRUCTURES.terminal[roomController.level] ? C.TERMINAL_CAPACITY : 0;
        if(energyCapacity != object.energyCapacity) {
            bulk.update(object, {energyCapacity});
        }
    }

};