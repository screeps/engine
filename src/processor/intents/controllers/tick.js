var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, {bulk, bulkUsers, gameTime, roomInfo, users}) {

    if(!object || object.type != 'controller') return;

    if(object.reservation && (gameTime >= object.reservation.endTime-1 || object.user)) {
        bulk.update(object, {reservation: null});
    }

    if(!object.user) {
        return;
    }

    driver.addRoomToUser(object.room, users[object.user], bulkUsers);

    if(object._upgradeBlocked) {
        bulk.update(object, {upgradeBlocked: object._upgradeBlocked});
        delete object._upgradeBlocked;
    }

    if(!object.downgradeTime || object.tutorial) {
        bulk.update(object, {downgradeTime: gameTime + C.CONTROLLER_DOWNGRADE[object.level] + 1});
        return;
    }

    if(object._upgraded) {
        bulk.update(object, {downgradeTime: Math.min(
            object.downgradeTime + C.CONTROLLER_DOWNGRADE_RESTORE + 1,
            gameTime + C.CONTROLLER_DOWNGRADE[object.level] + 1)});
        return;
    }

    if(gameTime == object.downgradeTime-3000) {
        driver.sendNotification(object.user, `Attention! Your Controller in room ${object.room} will be downgraded to level ${object.level-1} in 3000 ticks (~2 hours)! Upgrade it to prevent losing of this room. <a href='http://support.screeps.com/hc/en-us/articles/203086021-Territory-control'>Learn more</a>`);
    }

    while((gameTime >= object.downgradeTime-1) && (object.level > 0)) {
        object.level--;
        driver.sendNotification(object.user, `Your Controller in room ${object.room} has been downgraded to level ${object.level} due to absence of upgrading activity!`);
        if(object.level == 0) {
            driver.removeRoomFromUser(object.room, users[object.user], bulkUsers);

            object.progress = 0;
            object.user = null;
            object.downgradeTime = null;
            object.upgradeBlocked = null;
            object.safeMode = null;
            object.safeModeAvailable = 0;
            object.safeModeCooldown = roomInfo.novice > Date.now() ? null : gameTime + C.SAFE_MODE_COOLDOWN
            object.isPowerEnabled = false;
        }
        else {
            object.downgradeTime += C.CONTROLLER_DOWNGRADE[object.level]/2 + 1;
            object.progress += Math.round(C.CONTROLLER_LEVELS[object.level] * 0.9);
            object.safeModeAvailable = 0;
            object.safeModeCooldown = roomInfo.novice > Date.now() ? null : gameTime + C.SAFE_MODE_COOLDOWN
        }

        bulk.update(object, {
            downgradeTime: object.downgradeTime,
            level: object.level,
            progress: object.progress,
            user: object.user,
            upgradeBlocked: object.upgradeBlocked,
            safeMode: object.safeMode,
            safeModeCooldown: object.safeModeCooldown,
            safeModeAvailable: object.safeModeAvailable,
            isPowerEnabled: object.isPowerEnabled
        });
    }


};
