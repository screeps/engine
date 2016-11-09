var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk, bulkUsers, gameTime, roomInfo) {

    if(!object.user || !object.level) {
        return;
    }
    if(!(object.safeModeAvailable >= 0)) {
        return;
    }
    if(object.safeModeCooldown >= gameTime) {
        return;
    }
    if(object.upgradeBlocked > gameTime) {
        return;
    }

    bulk.update(object, {
        safeModeAvailable: object.safeModeAvailable - 1,
        safeMode: gameTime + C.SAFE_MODE_DURATION,
        safeModeCooldown: roomInfo.novice > Date.now() ? null : gameTime + C.SAFE_MODE_COOLDOWN
    });
};