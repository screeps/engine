const _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    strongholds = driver.strongholds;

module.exports = function(object, scope) {
    const { templates, coreRewards } = strongholds;
    if(!object || !object.depositType || !coreRewards[object.depositType] || !_.some(coreRewards[object.depositType]) || !object.templateName || !templates[object.templateName]) {
        return;
    }

    const rewards = coreRewards[object.depositType].slice(0, 1+templates[object.templateName].rewardLevel);
    // TODO: generate real amounts
    const store = _.reduce(rewards, (acc, resource) => { acc[resource] = 1; return acc;}, {});

    const { bulk } = scope;

    bulk.update(object, { store });
};
