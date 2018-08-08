var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, roomObjects, roomTerrain, bulk, bulkUsers, roomController, gameTime) {

    if(!object || object.type != 'keeperLair') return;



    if(!object.nextSpawnTime) {
        var keeper = _.find(roomObjects, (i) => i.type == 'creep' && i.user == '3' && i.name.startsWith('Keeper'+object._id));
        if(!keeper || keeper.hits < 5000) {
            bulk.update(object, {nextSpawnTime: gameTime + C.ENERGY_REGEN_TIME});
        }
    }

    if(object.nextSpawnTime && gameTime >= object.nextSpawnTime-1) {
        var keeper = _.find(roomObjects, (i) => i.type == 'creep' && i.user == '3' && i.name.startsWith('Keeper'+object._id));
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

        const srcs = _.filter(roomObjects, o => o.type === 'source' || o.type === 'mineral');

        // TODO: It's possible for two keepers to guard the same source,
        // leaving one unguarded. This will only occur when two lairs are
        // equally close to two sources.
        // The shuffle makes this occur only half the time.
        const src = _.min(_.shuffle(srcs), s => utils.dist(src, object));

        // The OR defaults protect against rooms with keeper lairs but no sources or minerals.
        const loc = (src.x || object.x) * 100 + (src.y || object.y);

        bulk.insert({
            name: 'Keeper'+object._id+"_"+loc,
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