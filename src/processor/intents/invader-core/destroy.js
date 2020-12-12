const _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    strongholds = driver.strongholds;

module.exports = function(object, scope) {
    const { templates, coreRewards, coreAmounts, coreDensities } = strongholds;
    const { bulk, roomController } = scope;

    if(roomController) {
        bulk.update(roomController, {
            user: null,
            level: 0,
            progress: 0,
            downgradeTime: null,
            safeMode: null,
            safeModeAvailable: 0,
            safeModeCooldown: null,
            isPowerEnabled: false,
            effects: null
        });
    }

    if(!object || !object.depositType || !coreRewards[object.depositType] || !_.some(coreRewards[object.depositType]) || !object.templateName || !templates[object.templateName]) {
        return;
    }

    const rewardLevel = templates[object.templateName].rewardLevel;
    const rewards = coreRewards[object.depositType].slice(0, 1+rewardLevel);
    const rewardDensities = coreDensities.slice(0, 1+rewardLevel);

    const store = utils.calcReward(_.object(rewards, rewardDensities), coreAmounts[rewardLevel]);

    bulk.update(object, { store });

    driver.config.emit('strongholdDestroyed', object, scope);
};
