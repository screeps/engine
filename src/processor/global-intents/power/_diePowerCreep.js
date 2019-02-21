var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, {roomObjects, bulkObjects, bulkUsersPowerCreeps, gameTime}) {

    let tombstone = {
        type: 'tombstone',
        room: object.room,
        x: object.x,
        y: object.y,
        user: object.user,
        deathTime: gameTime,
        decayTime: gameTime + C.TOMBSTONE_DECAY_POWER_CREEP,
        powerCreepId: ""+object._id,
        powerCreepName: object.name,
        powerCreepTicksToLive: object.ageTime - gameTime,
        powerCreepClassName: object.className,
        powerCreepLevel: object.level,
        powerCreepPowers: _.mapValues(object.powers, i => ({level: i.level})),
        powerCreepSaying: object.actionLog && object.actionLog.say && object.actionLog.say.isPublic ? object.actionLog.say.message : undefined
    };
    
    let container = _.find(roomObjects, { type: 'container', x: object.x, y: object.y });

    C.RESOURCES_ALL.forEach(resourceType => {
        if (object[resourceType] > 0) {
            let amount = object[resourceType];
            if(container && container.hits > 0) {
                let targetTotal = utils.calcResources(container);
                let toContainerAmount = Math.min(amount, container.energyCapacity - targetTotal);
                if(toContainerAmount > 0) {
                    container[resourceType] = container[resourceType] || 0;
                    container[resourceType] += toContainerAmount;
                    bulkObjects.update(container, {[resourceType]: container[resourceType]});
                    amount -= toContainerAmount;
                }
            }
            if(amount > 0){
                tombstone[resourceType] = (tombstone[resourceType] || 0) + amount;
            }
        }
    });

    bulkObjects.insert(tombstone);

    bulkObjects.remove(object._id);

    bulkUsersPowerCreeps.update(object._id, {
        shard: null,
        spawnCooldownTime: Date.now() + C.POWER_CREEP_SPAWN_COOLDOWN
    });
};