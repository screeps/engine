var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, scope) {

    const {roomObjects, bulk, roomController, energyAvailable, gameTime} = scope;

    if(!object || object.type != 'spawn') return;

    if(object.spawning) {
        const effect = _.find(object.effects, {power: C.PWR_DISRUPT_SPAWN});
        if(effect && effect.endTime > gameTime) {
            bulk.update(object, {spawning: {spawnTime: 1+object.spawning.spawnTime}});
        } else {
            if(gameTime >= object.spawning.spawnTime-1) {
                const spawningCreep = _.find(roomObjects, {type: 'creep', name: object.spawning.name, x: object.x, y: object.y});

                const bornOk = require('./_born-creep')(object, spawningCreep, scope);

                if(bornOk) {
                    bulk.update(object, {spawning: null});
                }
                else {
                    bulk.update(object, {spawning: {spawnTime: 1+gameTime}});
                }
            }
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

    if(!object.tutorial && energyAvailable < C.SPAWN_ENERGY_CAPACITY && object.store.energy < C.SPAWN_ENERGY_CAPACITY) {
        object.store.energy++;
        bulk.update(object, {store:{energy: object.store.energy}});
    }

};
