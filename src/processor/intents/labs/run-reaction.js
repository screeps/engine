var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk) {

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

    if(!C.REACTIONS[lab1.mineralType][lab2.mineralType] || object.mineralType && object.mineralType != C.REACTIONS[lab1.mineralType][lab2.mineralType]) {
        return;
    }

    bulk.update(object, {
        mineralAmount: object.mineralAmount + C.LAB_REACTION_AMOUNT,
        cooldown: C.LAB_COOLDOWN
    });
    if(!object.mineralType) {
        bulk.update(object, {mineralType: C.REACTIONS[lab1.mineralType][lab2.mineralType]});
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