var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime) {

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'controller') {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }
    if(target.bindUser && object.user != target.bindUser) {
        return;
    }
    if(target.level > 0) {
        return;
    }
    if(target.reservation && target.reservation.user != object.user) {
        return;
    }

    var level = 1;

    bulk.update(target, {
        user: object.user,
        level,
        progress: 0,
        downgradeTime: null,
        reservation: null
    });
};