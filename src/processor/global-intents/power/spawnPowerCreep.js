var q = require('q'),
    _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(intent, user, {roomObjectsByType, userPowerCreeps, bulkObjects,
    bulkUsersPowerCreeps, shardName, gameTime}) {

    const powerSpawn = _.find(roomObjectsByType.powerSpawn, i => i._id == intent.id);
    if(!powerSpawn || powerSpawn.user != user._id)
        return;


    var powerCreep = _.find(userPowerCreeps, i => i.user == user._id && i.name == intent.name);
    if (!powerCreep || powerCreep.spawnCooldownTime === null || powerCreep.spawnCooldownTime > Date.now()) {
        return;
    }

    bulkObjects.insert(Object.assign({}, powerCreep, {
        type: 'powerCreep',
        room: powerSpawn.room,
        x: powerSpawn.x,
        y: powerSpawn.y,
        hits: powerCreep.hitsMax,
        spawnCooldownTime: null,
        ageTime: gameTime + C.CREEP_LIFE_TIME
    }), powerCreep._id);

    bulkUsersPowerCreeps.update(powerCreep, {
        shard: shardName,
        spawnCooldownTime: null
    });
};