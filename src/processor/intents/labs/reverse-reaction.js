const _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {
    const {roomObjects, bulk, gameTime} = scope;

    if(!object || object.type != 'lab' || !!object.cooldownTime && object.cooldownTime > gameTime) {
        return;
    }

    let reactionAmount = C.LAB_REACTION_AMOUNT;
    const effect = _.find(object.effects, {power: C.PWR_OPERATE_LAB});
    if(effect && effect.endTime > gameTime) {
        reactionAmount += C.POWER_INFO[C.PWR_OPERATE_LAB].effect[effect.level-1];
    }

    const mineralType = _(object.store).keys().filter(k => k != C.RESOURCE_ENERGY && object.store[k]).first();
    if((object.store[mineralType]||0) < reactionAmount) {
        return;
    }

    const lab1 = roomObjects[intent.lab1];
    const lab1MineralType = _(lab1.store).keys().filter(k => k != C.RESOURCE_ENERGY && lab1.store[k]).first();
    if(!lab1 ||
        lab1.type != 'lab' ||
        !!lab1MineralType && ((lab1.store[lab1MineralType] + reactionAmount) > lab1.storeCapacityResource[lab1MineralType])) {
        return;
    }

    const lab2 = roomObjects[intent.lab2];
    const lab2MineralType = _(lab2.store).keys().filter(k => k != C.RESOURCE_ENERGY && lab2.store[k]).first();
    if(!lab2 ||
        lab2.type != 'lab' ||
        !!lab2MineralType && ((lab2.store[lab2MineralType] + reactionAmount) > lab2.storeCapacityResource[lab2MineralType])) {
        return;
    }

    const variants = utils.getReactionVariants(mineralType);
    const variant = _.find(variants, v =>
        (!lab1MineralType || lab1MineralType == v[0]) &&
        (!lab2MineralType || lab2MineralType == v[1]));
    if(!variant) {
        return;
    }

    object.store[mineralType] -= reactionAmount;
    if(object.store[mineralType]) {
        bulk.update(object, {
            store: {[mineralType]: object.store[mineralType]},
            cooldownTime: gameTime + C.REACTION_TIME[mineralType]});
    } else {
        bulk.update(object, {
            store: {[mineralType]: object.store[mineralType]},
            storeCapacityResource: {[mineralType]: null},
            storeCapacity: C.LAB_ENERGY_CAPACITY + C.LAB_MINERAL_CAPACITY,
            cooldownTime: gameTime + C.REACTION_TIME[mineralType]
        });
    }

    if(lab1.storeCapacityResource[variant[0]]) {
        bulk.update(lab1, {
            store: {[variant[0]]: (lab1.store[variant[0]]||0) + reactionAmount}
        });
    } else {
        bulk.update(lab1, {
            store: {[variant[0]]: (lab1.store[variant[0]]||0) + reactionAmount},
            storeCapacityResource: {[variant[0]]: C.LAB_MINERAL_CAPACITY},
            storeCapacity: null
        });
    }

    if(lab2.storeCapacityResource[variant[1]]) {
        bulk.update(lab2, {
            store: {[variant[1]]: (lab2.store[variant[1]]||0) + reactionAmount}
        });
    } else {
        bulk.update(lab2, {
            store: {[variant[1]]: (lab2.store[variant[1]]||0) + reactionAmount},
            storeCapacityResource: {[variant[1]]: C.LAB_MINERAL_CAPACITY},
            storeCapacity: null
        });
    }

    object.actionLog.reverseReaction = {x1: lab1.x, y1: lab1.y, x2: lab2.x, y2: lab2.y};
};
