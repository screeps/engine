var q = require('q'),
    _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(intent, user, {userPowerCreeps, bulkObjects, bulkUsersPowerCreeps}) {

    var powerCreep = _.find(userPowerCreeps, i => i.user == user._id && i._id == intent.id);

    if (!powerCreep || powerCreep.spawnCooldownTime === null) {
        return;
    }

    if(intent.cancel) {
        bulkUsersPowerCreeps.update(powerCreep._id, {deleteTime: null});
    }
    else {
        console.log(user.powerExperimentationTime);
        if(user.powerExperimentationTime > Date.now()) {
            bulkUsersPowerCreeps.remove(powerCreep._id);
            return;
        }
        if (powerCreep.deleteTime) {
            return;
        }
        bulkUsersPowerCreeps.update(powerCreep._id, {deleteTime: Date.now() + C.POWER_CREEP_DELETE_COOLDOWN});
    }
};