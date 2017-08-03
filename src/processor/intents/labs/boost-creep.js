var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk) {

    if(object.mineralAmount < C.LAB_BOOST_MINERAL || object.energy < C.LAB_BOOST_ENERGY) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'creep') {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }

    var nonBoostedParts = _.filter(target.body, i => !i.boost && C.BOOSTS[i.type] && C.BOOSTS[i.type][object.mineralType]);

    if(!nonBoostedParts.length) {
        return;
    }

    if(nonBoostedParts[0].type != C.TOUGH) {
        nonBoostedParts.reverse();
    }

    if(intent.bodyPartsCount) {
        nonBoostedParts = nonBoostedParts.slice(0,intent.bodyPartsCount);
    }

    while(object.mineralAmount >= C.LAB_BOOST_MINERAL && object.energy >= C.LAB_BOOST_ENERGY && nonBoostedParts.length) {
        nonBoostedParts[0].boost = object.mineralType;
        object.mineralAmount -= C.LAB_BOOST_MINERAL;
        object.energy -= C.LAB_BOOST_ENERGY;
        nonBoostedParts.splice(0,1);
    }

    bulk.update(object, {mineralAmount: object.mineralAmount, energy: object.energy});

    if(!object.mineralAmount) {
        bulk.update(object, {mineralType: null});
    }

    require('../creeps/_recalc-body')(target);

    bulk.update(target, {body: target.body, energyCapacity: target.energyCapacity});
    target.actionLog.healed = {x: object.x, y: object.y};
};
