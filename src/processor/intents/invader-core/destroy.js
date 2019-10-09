const _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    strongholds = driver.strongholds;

module.exports = function(object, scope) {
    const { templates, coreRewards } = strongholds;
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

    const densities = [1, 10, 220, 1400, 5100, 14000, 31500];
    const amounts = [0, 5000, 25000, 50000, 250000, 500000];

    const rewardLevel = templates[object.templateName].rewardLevel;
    const rewards = coreRewards[object.depositType].slice(0, 2+rewardLevel);
    const rewardDensities = densities.slice(0, 2+rewardLevel);

    const store = utils.calcReward(_.object(rewards, rewardDensities), amounts[rewardLevel]);

    bulk.update(object, { store });
};
