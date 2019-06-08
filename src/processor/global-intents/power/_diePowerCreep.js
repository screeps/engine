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
        store: {},
        powerCreepId: ""+object._id,
        powerCreepName: object.name,
        powerCreepTicksToLive: object.ageTime - gameTime,
        powerCreepClassName: object.className,
        powerCreepLevel: object.level,
        powerCreepPowers: _.mapValues(object.powers, i => ({level: i.level})),
        powerCreepSaying: object.actionLog && object.actionLog.say && object.actionLog.say.isPublic ? object.actionLog.say.message : undefined
    };

    let container = _.find(roomObjects, { type: 'container', x: object.x, y: object.y });
    if(container) {
        container.store = container.store || {};
    }

    if(object.store) {
        _.forEach(object.store, (amount, resourceType) => {
            if(amount <= 0) {
                return;
            }
            if(container && container.hits > 0) {
                const targetTotal = utils.calcResources(container);
                const toContainerAmount = Math.min(amount, container.storeCapacity - targetTotal);
                if(toContainerAmount > 0) {
                    container.store[resourceType] = (container.store[resourceType] || 0) + toContainerAmount;
                    bulkObjects.update(container, {store: {[resourceType]: container.store[resourceType]}});
                    amount -= toContainerAmount;
                }
                if(amount > 0){
                    tombstone.store[resourceType] = (tombstone.store[resourceType] || 0) + amount;
                }
            }
        })
    }

    bulkObjects.insert(tombstone);

    bulkObjects.remove(object._id);

    bulkUsersPowerCreeps.update(object._id, {
        shard: null,
        spawnCooldownTime: Date.now() + C.POWER_CREEP_SPAWN_COOLDOWN
    });
};
