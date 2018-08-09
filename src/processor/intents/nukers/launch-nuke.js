var _ = require('lodash'),
    config = require('../../../config'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;


module.exports = function(object, intent, {roomObjects, bulk, roomController, gameTime, roomInfo}) {

    if(!utils.checkStructureAgainstController(object, roomObjects, roomController)) {
        return;
    }
    if(object.G < object.GCapacity || object.energy < object.energyCapacity) {
        return;
    }
    if(object.cooldownTime > gameTime) {
        return;
    }
    if(intent.x < 0 || intent.y < 0 || intent.x > 49 || intent.y > 49) {
        return;
    }
    if(roomInfo.novice && roomInfo.novice > Date.now() || roomInfo.respawnArea && roomInfo.respawnArea > Date.now()) {
        return;
    }

    bulk.update(object, {
        energy: 0,
        G: 0,
        cooldownTime: gameTime + (config.ptr ? 100 : C.NUKER_COOLDOWN)
    });

    bulk.insert({
        type: 'nuke',
        room: intent.roomName,
        x: intent.x,
        y: intent.y,
        landTime: gameTime + (config.ptr ? 100 : C.NUKE_LAND_TIME),
        launchRoomName: object.room
    });

};