var q = require('q'),
    _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(intent, user, scope) {

    const {roomObjectsByType} = scope;

    var powerCreep = _.find(roomObjectsByType.powerCreep, i => i.user == user._id && i._id == intent.id);
    if (!powerCreep) {
        return;
    }

    require('./_diePowerCreep')(powerCreep, scope);
};