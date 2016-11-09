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
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }
    if(roomController && roomController.user != object.user && roomController.safeMode > gameTime) {
        return;
    }

    var healPower = utils.calcBodyEffectiveness(object.body, C.HEAL, 'heal', C.HEAL_POWER);

    target.hits += healPower;

    if(target.hits > target.hitsMax) {
        target.hits = target.hitsMax;
    }


    recalcBody(target);
    object.actionLog.heal = {x: target.x, y: target.y};
    target.actionLog.healed = {x: object.x, y: object.y};

    bulk.update(target, {
        hits: target.hits,
        body: target.body,
        energyCapacity: target.energyCapacity
    });

    function recalcBody(object) {
        require('./_recalc-body')(object);
    }


};