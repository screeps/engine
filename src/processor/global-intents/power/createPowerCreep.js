var q = require('q'),
    _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(intent, user, {userPowerCreeps, bulkUsersPowerCreeps}) {

    var thisUserPowerCreeps = _.filter(userPowerCreeps, i => i.user == user._id);

    var powerLevel = Math.floor(Math.pow((user.power || 0) / C.POWER_LEVEL_MULTIPLY, 1 / C.POWER_LEVEL_POW));
    var used = thisUserPowerCreeps.length + _.sum(thisUserPowerCreeps, 'level') + (user._usedPowerLevels||0);
    if(used >= powerLevel) {
        return;
    }

    if(Object.values(C.POWER_CLASS).indexOf(intent.className) === -1) {
        return;
    }

    var name = intent.name.substring(0,50);

    if(_.any(thisUserPowerCreeps, {name})) {
        return;
    }

    bulkUsersPowerCreeps.insert({
        name,
        className: intent.className,
        user: ""+user._id,
        level: 0,
        hitsMax: 1000,
        store: {},
        storeCapacity: 100,
        spawnCooldownTime: 0,
        powers: {}
    });

    user._usedPowerLevels = (user._usedPowerLevels||0) + 1;
};
