var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, energyAvailable) {

    if(!object || object.type != 'spawn') return;

    if(object.spawning) {
        object.spawning.remainingTime--;

        if(object.spawning.remainingTime <= 0) {

            var spawningCreep = _.find(roomObjects, {type: 'creep', name: object.spawning.name, x: object.x, y: object.y});

            var bornOk = require('./_born-creep')(object, spawningCreep, roomObjects, roomTerrain, bulk, stats);

            if(bornOk) {
                bulk.update(object, {spawning: null});
            }
            else {
                bulk.update(object, {spawning: {remainingTime: 0}});
            }
        }
        else {
            bulk.update(object, {spawning: {remainingTime: object.spawning.remainingTime}});
        }
    }

    if(!roomController || roomController.level < 1 || roomController.user != object.user) {
        return;
    }
    var spawns = _.filter(roomObjects, {type: 'spawn'});
    if(spawns.length > C.CONTROLLER_STRUCTURES.spawn[roomController.level]) {
        spawns.sort(utils.comparatorDistance(roomController));
        spawns = _.take(spawns, C.CONTROLLER_STRUCTURES.spawn[roomController.level]);
        if(!_.contains(spawns, object)) {
            return;
        }
    }

    if(!object.tutorial && energyAvailable < C.SPAWN_ENERGY_CAPACITY && object.energy < C.SPAWN_ENERGY_CAPACITY) {
        object.energy++;
        bulk.update(object, {energy: object.energy});
    }

};