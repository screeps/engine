var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, gameTime}) {

    if(!!object.cooldownTime && object.cooldownTime > gameTime) {
        return;
    }

    let reactionAmount = C.LAB_REACTION_AMOUNT;
    const effect = _.find(object.effects, {power: C.PWR_OPERATE_LAB});
    if(effect && effect.endTime > gameTime) {
        reactionAmount += C.POWER_INFO[C.PWR_OPERATE_LAB].effect[effect.level-1];
    }

    const lab1 = roomObjects[intent.lab1];
    if(!lab1 || lab1.type != 'lab') {
        return;
    }
    const lab1MineralType = _(lab1.store).keys().filter(k => k != C.RESOURCE_ENERGY && lab1.store[k]).first();
    if(!lab1MineralType || lab1.store[lab1MineralType] < reactionAmount) {
        return;
    }
    if(Math.abs(lab1.x - object.x) > C.RANGE_RUN_REACTION || Math.abs(lab1.y - object.y) > C.RANGE_RUN_REACTION) {
        return;
    }

    const lab2 = roomObjects[intent.lab2];
    if(!lab2 || lab2.type != 'lab') {
        return;
    }
    const lab2MineralType = _(lab2.store).keys().filter(k => k != C.RESOURCE_ENERGY && lab2.store[k]).first();
    if(!lab2MineralType || lab2.store[lab2MineralType] < reactionAmount) {
        return;
    }
    if(Math.abs(lab2.x - object.x) > C.RANGE_RUN_REACTION || Math.abs(lab2.y - object.y) > C.RANGE_RUN_REACTION) {
        return;
    }

    const mineralType = _(object.store).keys().filter(k => k != C.RESOURCE_ENERGY && object.store[k]).first();
    if((object.store[mineralType]||0) + reactionAmount > C.LAB_MINERAL_CAPACITY) {
        return;
    }

    const product = C.REACTIONS[lab1MineralType][lab2MineralType];

    if(!product || mineralType && mineralType != product) {
        return;
    }

    if(object.storeCapacityResource[product]) {
        bulk.update(object, {
            store: {[product]: (object.store[product]||0) + reactionAmount},
            cooldownTime: gameTime + C.REACTION_TIME[product]
        });
    } else {
        bulk.update(object, {
            store: {[product]: (object.store[product]||0) + reactionAmount},
            cooldownTime: gameTime + C.REACTION_TIME[product],
            storeCapacityResource: {[product]: C.LAB_MINERAL_CAPACITY},
            storeCapacity: null
        });
    }

    lab1.store[lab1MineralType] -= reactionAmount;
    if(lab1.store[lab1MineralType]) {
        bulk.update(lab1, {store: {[lab1MineralType]: lab1.store[lab1MineralType]}});
    } else {
        bulk.update(lab1, {
            store: {[lab1MineralType]: lab1.store[lab1MineralType]},
            storeCapacityResource: {[lab1MineralType]: null},
            storeCapacity: C.LAB_ENERGY_CAPACITY + C.LAB_MINERAL_CAPACITY
        });
    }
    lab2.store[lab2MineralType] -= reactionAmount;
    if(lab2.store[lab2MineralType]) {
        bulk.update(lab2, {store: {[lab2MineralType]: lab2.store[lab2MineralType]}});
    } else {
        bulk.update(lab2, {
            store: {[lab2MineralType]: lab2.store[lab2MineralType]},
            storeCapacityResource: {[lab2MineralType]: null},
            storeCapacity: C.LAB_ENERGY_CAPACITY + C.LAB_MINERAL_CAPACITY
        });
    }

    object.actionLog.runReaction = {x1: lab1.x, y1: lab1.y, x2: lab2.x, y2: lab2.y};
};
