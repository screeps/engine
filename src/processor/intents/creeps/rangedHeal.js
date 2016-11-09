var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime) {

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'creep' || target.spawning || target.hits >= target.hitsMax) {
        return;
    }
    if(Math.abs(target.x - object.x) > 3 || Math.abs(target.y - object.y) > 3) {
        return;
    }
    if(roomController && roomController.user != object.user && roomController.safeMode > gameTime) {
        return;
    }

    var healPower = utils.calcBodyEffectiveness(object.body, C.HEAL, 'rangedHeal', C.RANGED_HEAL_POWER);

    target.hits += healPower;

    if(target.hits > target.hitsMax) {
        target.hits = target.hitsMax;
    }


    recalcBody(target);
    object.actionLog.rangedHeal = {x: target.x, y: target.y};
    target.actionLog.healed = {x: object.x, y: object.y};

    bulk.update(target, {
        hits: target.hits,
        body: target.body,
        energyCapacity: target.energyCapacity
    });

    function recalcBody(object) {

        var hits = object.hits;

        for(var i = object.body.length-1; i>=0; i--) {
            if(hits > 100)
                object.body[i].hits = 100;
            else
                object.body[i].hits = hits;
            hits -= 100;
            if(hits < 0) hits = 0;
        }

        object.energyCapacity = _.filter(object.body, (i) => i.hits > 0 && i.type == C.CARRY).length * C.CARRY_CAPACITY;
    }


};