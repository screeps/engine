var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk, bulkUsers, gameTime, roomInfo) {

    if(object.type != 'controller') {
        return;
    }

    if(!object.user || !object.level) {
        return;
    }

    bulk.update(object, {
        user: null,
        level: 0,
        progress: 0,
        downgradeTime: null,
        safeMode: null,
        safeModeAvailable: 0,
        safeModeCooldown: roomInfo.novice > Date.now() ? null : gameTime + C.SAFE_MODE_COOLDOWN
    });
};