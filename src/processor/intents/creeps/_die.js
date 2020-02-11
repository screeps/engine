var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, dropRate, violentDeath, {roomObjects, bulk, stats, gameTime, eventLog}, attackType) {

    if(dropRate === undefined) {
        dropRate = C.CREEP_CORPSE_RATE;
    }

    bulk.remove(object._id);
    delete roomObjects[object._id];

    let decayTime = object.body.length * C.TOMBSTONE_DECAY_PER_PART;
    if(object.tombstoneDecay) {
        decayTime = object.tombstoneDecay;
    }

    if(!attackType || attackType != C.EVENT_ATTACK_TYPE_NUKE) {
        let tombstone = {
            type: 'tombstone',
            room: object.room,
            x: object.x,
            y: object.y,
            user: object.user,
            deathTime: gameTime,
            decayTime: gameTime + decayTime,
            creepId: ""+object._id,
            creepName: object.name,
            creepTicksToLive: object.ageTime - gameTime,
            creepBody: _.map(object.body, b => b.type),
            creepSaying: object.actionLog && object.actionLog.say && object.actionLog.say.isPublic ? object.actionLog.say.message : undefined,
            store: {}
        };

        let container = _.find(roomObjects, { type: 'container', x: object.x, y: object.y });

        if(dropRate > 0 && !object.userSummoned && !object.strongholdId) {
            var lifeTime = _.any(object.body, {type: C.CLAIM}) ? C.CREEP_CLAIM_LIFE_TIME : C.CREEP_LIFE_TIME;
            var lifeRate = dropRate * object._ticksToLive / lifeTime;
            var bodyResources = {energy: 0};

            object.body.forEach(i => {
                if(i.boost) {
                    bodyResources[i.boost] = bodyResources[i.boost] || 0;
                    bodyResources[i.boost] += C.LAB_BOOST_MINERAL * lifeRate;
                    bodyResources.energy += C.LAB_BOOST_ENERGY * lifeRate;
                }
                bodyResources.energy += Math.min(
                    C.CREEP_PART_MAX_ENERGY,
                    C.BODYPART_COST[i.type] * lifeRate
                );
            });

            _.forEach(bodyResources, (amount, resourceType) => {
                amount = Math.floor(amount);
                if(amount > 0) {
                    if(container && container.hits > 0) {
                        container.store = container.store || {};
                        let targetTotal = utils.calcResources(container);
                        let toContainerAmount = Math.min(amount, container.storeCapacity - targetTotal);
                        if(toContainerAmount > 0) {
                            container.store[resourceType] = (container.store[resourceType] || 0) + toContainerAmount;
                            bulk.update(container, {store: {[resourceType]: container.store[resourceType]}});
                            amount -= toContainerAmount;
                        }
                    }
                    if(amount > 0){
                        tombstone.store[resourceType] = (tombstone.store[resourceType] || 0) + amount;
                    }
                }
            });

            _.forEach(object.store, (amount, resourceType) => {
                if(amount > 0) {
                    if(container && container.hits > 0) {
                        container.store = container.store || {};
                        let targetTotal = utils.calcResources(container);
                        let toContainerAmount = Math.min(amount, container.storeCapacity - targetTotal);
                        if(toContainerAmount > 0) {
                            container.store[resourceType] = (container.store[resourceType] || 0) + toContainerAmount;
                            bulk.update(container, {store: {[resourceType]: container.store[resourceType]}});
                            amount -= toContainerAmount;
                        }
                    }
                }
                if(amount > 0){
                    tombstone.store[resourceType] = (tombstone.store[resourceType] || 0) + amount;
                }
            });
        }

        bulk.insert(tombstone);
    }

    eventLog.push({event: C.EVENT_OBJECT_DESTROYED, objectId: object._id, data: {type: 'creep'}});

    if (violentDeath && stats && object.user != '3' && object.user != '2') {
        stats.inc('creepsLost', object.user, object.body.length);
    }
};
