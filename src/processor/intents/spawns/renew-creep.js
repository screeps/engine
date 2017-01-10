var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime) {

    if(object.type != 'spawn') {
        return;
    }
    if(object.spawning) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'creep' || target.user != object.user) {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }
    if(_.filter(target.body, (i) => i.type == C.CLAIM).length > 0) {
        return;
    }

    var effect = Math.floor(C.SPAWN_RENEW_RATIO * C.CREEP_LIFE_TIME / C.CREEP_SPAWN_TIME / target.body.length);
    if(target.ageTime + effect > gameTime + C.CREEP_LIFE_TIME) {
        return;
    }

    var cost = Math.ceil(C.SPAWN_RENEW_RATIO * utils.calcCreepCost(target.body) / C.CREEP_SPAWN_TIME / target.body.length);
    var result = require('./_charge-energy')(object, roomObjects, cost, bulk, roomController);

    if(!result) {
        return;
    }

    stats.inc('energyCreeps', object.user, cost);

    target.ageTime += effect;
    target.actionLog.healed = {x: object.x, y: object.y};
    bulk.inc(target, 'ageTime', effect);

    if(_.any(target.body, i => !!i.boost)) {
        target.body.forEach(i => {
            i.boost = null;
        });
        require('../creeps/_recalc-body')(target);
        bulk.update(target, {body: target.body, energyCapacity: target.energyCapacity});
    }

};
