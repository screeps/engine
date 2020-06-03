var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {bulk}) {
    if(!object ||
        !!intent.roomNames &&
        (!_.isArray(intent.roomNames) ||
        (intent.roomNames.length > 100) ||
        _.some(intent.roomNames, r => !/^(W|E)\d+(N|S)\d+$/.test(r)))) {
        return;
    }

    bulk.update(object, { whitelist: null });
    const whitelist = { rooms: intent.roomNames || null };
    bulk.update(object, { whitelist });
};
