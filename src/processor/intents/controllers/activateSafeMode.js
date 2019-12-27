var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {bulk, gameTime, roomInfo}) {

    if(!object.user || !object.level) {
        return;
    }
    if(!(object.safeModeAvailable > 0)) {
        return;
    }
    if(object.safeModeCooldown >= gameTime) {
        return;
    }
    if(object.upgradeBlocked > gameTime) {
        return;
    }
    if(object.downgradeTime < gameTime + C.CONTROLLER_DOWNGRADE[object.level]/2 - C.CONTROLLER_DOWNGRADE_SAFEMODE_THRESHOLD) {
        return;
    }

    object._safeModeActivated = 1;
};
