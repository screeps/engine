var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;


module.exports = function(spawn, intent, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats) {

    if(spawn.spawning) {
        return;
    }
    if(spawn.type != 'spawn')
        return;

    if(!utils.checkStructureAgainstController(spawn, roomObjects, roomController)) {
        return;
    }

    intent.body = intent.body.slice(0, C.MAX_CREEP_SIZE);

    var cost = utils.calcCreepCost(intent.body);
    var result = require('./_charge-energy')(spawn, roomObjects, cost, bulk);

    if(!result) {
        return;
    }

    stats.inc('energyCreeps', spawn.user, cost);

    stats.inc('creepsProduced', spawn.user, intent.body.length);

    bulk.update(spawn, {
        spawning: {
            name: intent.name,
            needTime: C.CREEP_SPAWN_TIME * intent.body.length,
            remainingTime: C.CREEP_SPAWN_TIME * intent.body.length
        }
    });

    var body = [], energyCapacity = 0;

    intent.body.forEach((i) => {
        if(_.contains(C.BODYPARTS_ALL, i)) {
            body.push({
                type: i,
                hits: 100
            });
        }

        if(i == C.CARRY)
            energyCapacity += C.CARRY_CAPACITY;
    });

    var creep = {
        name: intent.name,
        x: spawn.x,
        y: spawn.y,
        body,
        energy: 0,
        energyCapacity,
        type: 'creep',
        room: spawn.room,
        user: spawn.user,
        hits: body.length * 100,
        hitsMax: body.length * 100,
        spawning: true,
        fatigue: 0,
        notifyWhenAttacked: true
    };

    if(spawn.tutorial) {
        creep.tutorial = true;
    }

    bulk.insert(creep);
};