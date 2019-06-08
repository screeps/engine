var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk}) {
    if(!object || !object.store) {
        return;
    }

    const mineralType = _(object.store).keys().filter(k => k != C.RESOURCE_ENERGY && object.store[k]).first();
    if(!mineralType) {
        return;
    }
    if(object.store[mineralType] < C.LAB_BOOST_MINERAL || object.store.energy < C.LAB_BOOST_ENERGY) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'creep' || target.spawning) {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }

    var nonBoostedParts = _.filter(target.body, i => !i.boost && C.BOOSTS[i.type] && C.BOOSTS[i.type][mineralType]);

    if(!nonBoostedParts.length) {
        return;
    }

    if(nonBoostedParts[0].type != C.TOUGH) {
        nonBoostedParts.reverse();
    }

    if(intent.bodyPartsCount) {
        nonBoostedParts = nonBoostedParts.slice(0,intent.bodyPartsCount);
    }

    while(object.store[mineralType] >= C.LAB_BOOST_MINERAL && object.store.energy >= C.LAB_BOOST_ENERGY && nonBoostedParts.length) {
        nonBoostedParts[0].boost = mineralType;
        object.store[mineralType] -= C.LAB_BOOST_MINERAL;
        object.store.energy -= C.LAB_BOOST_ENERGY;
        nonBoostedParts.splice(0,1);
    }

    if(object.store[mineralType]) {
        bulk.update(object, {store:{[mineralType]: object.store[mineralType], energy: object.store.energy}});
    } else {
        bulk.update(object, {
            store:{[mineralType]: object.store[mineralType], energy: object.store.energy},
            storeCapacityResource:{[mineralType]: null},
            storeCapacity: C.LAB_ENERGY_CAPACITY + C.LAB_MINERAL_CAPACITY
        });
    }

    require('../creeps/_recalc-body')(target);

    bulk.update(target, {body: target.body, storeCapacity: target.storeCapacity});
    target.actionLog.healed = {x: object.x, y: object.y};
};
