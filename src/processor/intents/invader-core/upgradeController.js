const _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    strongholds = driver.strongholds;


module.exports = function(object, intent, scope) {
    const { roomObjects, bulk, gameTime, eventLog } = scope;

    if(object.type != 'invaderCore') {
        return;
    }

    const target = roomObjects[intent.id];
    if(!target || target.type != 'controller') {
        return;
    }

    if(target.level == 0 || target.user != object.user) {
        return;
    }
    if(target.upgradeBlocked && target.upgradeBlocked > gameTime) {
        return;
    }

    const effect = _.find(target.effects, {effect: C.EFFECT_INVULNERABILITY});
    if(effect) {
        effect.endTime = gameTime + 5000;
        console.log(`Effects found, new time ${effect.endTime}`);
    } else {
        target.effects = [{
            effect: C.EFFECT_INVULNERABILITY,
            endTime: gameTime + 5000,
            duration: 5000
        }];
        console.log(`Effects not found, creating ${JSON.stringify(target.effects)}`);
    }

    const upgradePower = strongholds.upgradePowers[object.level-1][target.level-1];
    console.log(`${object._id}: upgrade power ${upgradePower}`);
    target.downgradeTime = gameTime + 5000;
    if(target.level < 8) {
        const nextLevelProgress = C.CONTROLLER_LEVELS[target.level];
        if (target.progress + upgradePower >= nextLevelProgress) {
            target.progress = target.progress + upgradePower - nextLevelProgress;
            target.level++;
            if(target.level == 8) {
                target.progress = 0;
            }
        }
        else {
            target.progress = (target.progress||0) + upgradePower;
        }
    }

    target._upgraded += upgradePower;

    object.actionLog.upgradeController = {x: target.x, y: target.y};

    console.log(`Updating ${JSON.stringify(target)}`);

    const effects = target.effects;
    bulk.update(target, { effects: null });
    bulk.update(target, {
        level: target.level,
        progress: target.progress,
        downgradeTime: target.downgradeTime,
        effects
    });
    console.log(`Updated: ${JSON.stringify(target)}`);

    eventLog.push({event: C.EVENT_UPGRADE_CONTROLLER, objectId: object._id, data: {
            amount: upgradePower, energySpent: 0
        }});
};
