var q = require('q'),
    _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(intent, user, {userPowerCreeps, bulkObjects, bulkUsersPowerCreeps}) {

    var thisUserPowerCreeps = _.filter(userPowerCreeps, i => i.user == user._id);
    var powerCreep = _.find(thisUserPowerCreeps, i => i._id == intent.id);

    if (!powerCreep || powerCreep.spawnCooldownTime === null) {
        return;
    }

    var name = intent.name.substring(0,50);

    if(_.some(thisUserPowerCreeps, {name})) {
        return;
    }

    bulkUsersPowerCreeps.update(powerCreep._id, {name});
};