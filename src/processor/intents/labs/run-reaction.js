var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, gameTime}) {

    if(!!object.cooldownTime && object.cooldownTime > gameTime) {
        return;
    }

    var reactionAmount = C.LAB_REACTION_AMOUNT;
    var effect = _.find(object.effects, {power: C.PWR_OPERATE_LAB});
    if(effect && effect.endTime > gameTime) {
        reactionAmount += C.POWER_INFO[C.PWR_OPERATE_LAB].effect[effect.level-1];
    }

    var lab1 = roomObjects[intent.lab1];
    if(!lab1 || lab1.type != 'lab' || lab1.mineralAmount < reactionAmount) {
        return;
    }
    if(Math.abs(lab1.x - object.x) > 2 || Math.abs(lab1.y - object.y) > 2) {
        return;
    }

    var lab2 = roomObjects[intent.lab2];
    if(!lab2 || lab2.type != 'lab' || lab2.mineralAmount < reactionAmount) {
        return;
    }
    if(Math.abs(lab2.x - object.x) > 2 || Math.abs(lab2.y - object.y) > 2) {
        return;
    }

    if(object.mineralAmount > object.mineralCapacity - reactionAmount) {
        return;
    }

    let product = C.REACTIONS[lab1.mineralType][lab2.mineralType];

    if(!product || object.mineralType && object.mineralType != product) {
        return;
    }

    bulk.update(object, {
        mineralAmount: object.mineralAmount + reactionAmount,
        cooldownTime: gameTime + C.REACTION_TIME[product]
    });
    if(!object.mineralType) {
        bulk.update(object, {mineralType: product});
    }

    bulk.update(lab1, {mineralAmount: lab1.mineralAmount - reactionAmount});
    if(!lab1.mineralAmount) {
        bulk.update(lab1, {mineralType: null});
    }
    bulk.update(lab2, {mineralAmount: lab2.mineralAmount - reactionAmount});
    if(!lab2.mineralAmount) {
        bulk.update(lab2, {mineralType: null});
    }

    object.actionLog.runReaction = {x1: lab1.x, y1: lab1.y, x2: lab2.x, y2: lab2.y};
};
