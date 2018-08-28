var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk}) {

    if(object.cooldown > 0) {
        return;
    }

    var lab1 = roomObjects[intent.lab1];
    if(!lab1 || lab1.type != 'lab' || lab1.mineralAmount < C.LAB_REACTION_AMOUNT) {
        return;
    }
    if(Math.abs(lab1.x - object.x) > 2 || Math.abs(lab1.y - object.y) > 2) {
        return;
    }

    var lab2 = roomObjects[intent.lab2];
    if(!lab2 || lab2.type != 'lab' || lab2.mineralAmount < C.LAB_REACTION_AMOUNT) {
        return;
    }
    if(Math.abs(lab2.x - object.x) > 2 || Math.abs(lab2.y - object.y) > 2) {
        return;
    }

    if(object.mineralAmount > object.mineralCapacity - C.LAB_REACTION_AMOUNT) {
        return;
    }

    let product = C.REACTIONS[lab1.mineralType][lab2.mineralType];

    if(!product || object.mineralType && object.mineralType != product) {
        return;
    }

    let cooldown = C.REACTION_TIME[product] ;

    bulk.update(object, {
        mineralAmount: object.mineralAmount + C.LAB_REACTION_AMOUNT,
        cooldown
    });
    if(!object.mineralType) {
        bulk.update(object, {mineralType: product});
    }

    bulk.update(lab1, {mineralAmount: lab1.mineralAmount - C.LAB_REACTION_AMOUNT});
    if(!lab1.mineralAmount) {
        bulk.update(lab1, {mineralType: null});
    }
    bulk.update(lab2, {mineralAmount: lab2.mineralAmount - C.LAB_REACTION_AMOUNT});
    if(!lab2.mineralAmount) {
        bulk.update(lab2, {mineralType: null});
    }

    object.actionLog.runReaction = {x1: lab1.x, y1: lab1.y, x2: lab2.x, y2: lab2.y};
};