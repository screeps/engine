var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, roomObjects, roomTerrain, bulk, bulkUsers, roomController, gameTime) {

    if(!object || object.type != 'keeperLair') return;



    if(!object.nextSpawnTime) {
        var keeper = _.find(roomObjects, (i) => i.type == 'creep' && i.user == '3' && i.name == 'Keeper'+object._id);
        if(!keeper || keeper.hits < 5000) {
            bulk.update(object, {nextSpawnTime: gameTime + C.ENERGY_REGEN_TIME});
        }
    }

    if(object.nextSpawnTime && gameTime >= object.nextSpawnTime-1) {
        var keeper = _.find(roomObjects, (i) => i.type == 'creep' && i.user == '3' && i.name == 'Keeper'+object._id);
        if(keeper) {
            bulk.remove(keeper._id);
        }

        var body = [];

        for(var i=0;i<17;i++) {
            body.push({
                type: C.TOUGH,
                hits: 100
            });
        }
        for(var i=0;i<13;i++) {
            body.push({
                type: C.MOVE,
                hits: 100
            });
        }
        for(var i=0;i<10;i++) {
            body.push({
                type: C.ATTACK,
                hits: 100
            });
            body.push({
                type: C.RANGED_ATTACK,
                hits: 100
            });
        }

        bulk.insert({
            name: 'Keeper'+object._id,
            x: object.x,
            y: object.y,
            body,
            energy: 0,
            energyCapacity: 0,
            type: 'creep',
            room: object.room,
            user: '3',
            hits: 5000,
            hitsMax: 5000,
            spawning: false,
            fatigue: 0
        });

        bulk.update(object, {nextSpawnTime: null});
    }




};