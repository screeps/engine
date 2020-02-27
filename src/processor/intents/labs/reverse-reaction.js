var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

//TODO move to @screeps/common/lib/constants.js
C.REVERSE_REACTIONS = {};
for(var a in C.REACTIONS){
    for(var b in C.REACTIONS[a]){
        C.REVERSE_REACTIONS[C.REACTIONS[a][b]] = [a,b];
    }
}

module.exports = function(object, intent, roomObjects, roomTerrain, bulk) {

    if(object.cooldown > 0) {
        return;
    }

    var lab1 = roomObjects[intent.lab1];
    if(!lab1 || lab1.type != 'lab' || lab1.mineralAmount > lab1.mineralCapacity - C.LAB_REACTION_AMOUNT) {
        return;
    }
    if(Math.abs(lab1.x - object.x) > 2 || Math.abs(lab1.y - object.y) > 2) {
        return;
    }

    var lab2 = roomObjects[intent.lab2];
    if(!lab2 || lab2.type != 'lab' || lab2.mineralAmount > lab2.mineralCapacity - C.LAB_REACTION_AMOUNT) {
        return;
    }
    if(Math.abs(lab2.x - object.x) > 2 || Math.abs(lab2.y - object.y) > 2) {
        return;
    }

    if(object.mineralAmount < C.LAB_REACTION_AMOUNT) {
        return;
    }

    if(lab1.mineralType === C.REVERSE_REACTIONS[object.mineralType][1]) {
        [lab1, lab2] = [lab2, lab1]
    }

    if(!(
         (lab1.mineralAmount === 0 || lab1.mineralType === C.REVERSE_REACTIONS[object.mineralType][0])
         &&
         (lab2.mineralAmount === 0 || lab2.mineralType === C.REVERSE_REACTIONS[object.mineralType][1])
        )
      ) {
        return;
    }

    bulk.update(lab1, {mineralAmount: lab1.mineralAmount + C.LAB_REACTION_AMOUNT});
    if(!lab1.mineralType) {
        bulk.update(lab1, {mineralType: C.REVERSE_REACTIONS[object.mineralType][0]});
    }
    bulk.update(lab2, {mineralAmount: lab2.mineralAmount + C.LAB_REACTION_AMOUNT});
    if(!lab2.mineralType) {
        bulk.update(lab2, {mineralType: C.REVERSE_REACTIONS[object.mineralType][1]});
    }

    bulk.update(object, {
        mineralAmount: object.mineralAmount - C.LAB_REACTION_AMOUNT,
        cooldown: C.LAB_COOLDOWN
    });
    if(!object.mineralAmount) {
        bulk.update(object, {mineralType: null});
    }

    //TODO add client animation for this
    object.actionLog.reverseReaction = {x1: lab1.x, y1: lab1.y, x2: lab2.x, y2: lab2.y};
};