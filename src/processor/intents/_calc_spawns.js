var _ = require('lodash'),
    utils = require('../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(roomSpawns, roomExtensions, {roomController, bulk}) {
    var spawns = roomSpawns;

    if(spawns.length > C.CONTROLLER_STRUCTURES.spawn[roomController.level|0]) {
        spawns.sort(utils.comparatorDistance(roomController));
        spawns = _.take(spawns, C.CONTROLLER_STRUCTURES.spawn[roomController.level|0]);
        roomSpawns.forEach(i => i._off = !_.contains(spawns, i));
    }
    else {
        roomSpawns.forEach(i => i._off = false);
    }

    roomSpawns.forEach(i => {
        if(i._off !== i.off) {
            bulk.update(i._id, {off: i._off});
        }
    });


    var extensions = roomExtensions;

    if(extensions.length > C.CONTROLLER_STRUCTURES.extension[roomController.level|0]) {
        extensions.sort(utils.comparatorDistance(roomController));
        extensions = _.take(extensions, C.CONTROLLER_STRUCTURES.extension[roomController.level|0]);
        roomExtensions.forEach(i => i._off = !_.contains(extensions, i));
    }
    else {
        roomExtensions.forEach(i => i._off = false);
    }

    roomExtensions.forEach(i => {
        if(i._off !== i.off) {
            bulk.update(i._id, {off: i._off});
        }
    });
};