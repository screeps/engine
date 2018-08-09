var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk, roomController}) {

    if(object.type != 'link') {
        return;
    }

    if(object.energy < intent.amount || intent.amount < 0) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target) {
        return;
    }

    if(!_.contains(['link','creep'], target.type)) {
        return;
    }
    var targetTotal;
    if(target.type == 'creep') {
        if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
            return;
        }
        targetTotal = utils.calcResources(target);
    }
    if(target.type == 'link') {
        if(object.cooldown > 0) {
            return;
        }
        if(!utils.checkStructureAgainstController(object, roomObjects, roomController)) {
            return;
        }
        targetTotal = target.energy;
    }

    if(targetTotal == target.energyCapacity) {
        return;
    }

    var amount = intent.amount;
    if(targetTotal + amount > target.energyCapacity) {
        amount = target.energyCapacity - targetTotal;
    }

    target.energy += amount;
    object.energy -= amount;

    if(target.type == 'link') {
        target.energy -= Math.ceil(amount * C.LINK_LOSS_RATIO);
        object.cooldown += C.LINK_COOLDOWN * Math.max(Math.abs(target.x - object.x), Math.abs(target.y - object.y));
        object.actionLog.transferEnergy = {x: target.x, y: target.y};
    }



    bulk.update(object, {energy: object.energy, cooldown: object.cooldown, actionLog: object.actionLog});
    bulk.update(target, {energy: target.energy});
};