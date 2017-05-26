var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

module.exports = function(object, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime) {

    if(!object || object.type != 'creep') return;

    if(object.spawning) {
        var spawn = _.find(roomObjects, {type: 'spawn', x: object.x, y: object.y});
        if(!spawn) {
            bulk.remove(object._id);
        }
        else {
            if(!spawn.spawning || spawn.spawning.name != object.name) {
                require('../spawns/_born-creep')(spawn, object, roomObjects, roomTerrain, bulk, stats);
            }
        }
    }
    else {

        movement.execute(object, bulk, roomController, gameTime);

        if((object.x == 0 || object.y == 0 || object.x == 49 || object.y == 49) && object.user != '2' && object.user != '3') {


            var [roomX, roomY] = utils.roomNameToXY(object.room),
                x = object.x,
                y = object.y,
                room = object.room;

            if (object.x == 0) {
                x = 49;
                room = utils.getRoomNameFromXY(roomX-1, roomY);
            }
            else if (object.y == 0) {
                y = 49;
                room = utils.getRoomNameFromXY(roomX, roomY-1);
            }
            else if (object.x == 49) {
                x = 0;
                room = utils.getRoomNameFromXY(roomX+1, roomY);
            }
            else if (object.y == 49) {
                y = 0;
                room = utils.getRoomNameFromXY(roomX, roomY+1);
            }

            bulk.update(object, {interRoom: {room, x, y}});
        }

        var portal = _.find(roomObjects, i => i.type == 'portal' && i.x == object.x && i.y == object.y);
        if(portal) {
            bulk.update(object, {interRoom: portal.destination});
        }

        if(!object.tutorial) {
            if(!object.ageTime) {
                object.ageTime = gameTime + (_.any(object.body, {type: C.CLAIM}) ? C.CREEP_CLAIM_LIFE_TIME : C.CREEP_LIFE_TIME);
                bulk.update(object, {ageTime: object.ageTime});
            }

            if(gameTime >= object.ageTime-1) {

                C.RESOURCES_ALL.forEach(resourceType => {
                    var amount = object[resourceType];
                    if (amount) {
                        require('./_create-energy')(object.x, object.y, object.room, amount, roomObjects, bulk, resourceType);
                    }
                });

                bulk.remove(object._id);
                delete roomObjects[object._id];
            }
        }

        if(!_.isEqual(object.actionLog, object._actionLog)) {
            bulk.update(object, {actionLog: object.actionLog});
        }

    }


    if(object.fatigue > 0) {
        var moves = utils.calcBodyEffectiveness(object.body, C.MOVE, 'fatigue', 1);

        object.fatigue -= moves * 2;

        if(object.fatigue < 0)
            object.fatigue = 0;

        bulk.update(object._id, {fatigue: object.fatigue});
    }

    if(_.isNaN(object.hits) || object.hits <= 0) {
        require('./_die')(object, roomObjects, bulk, stats);
    }

    if(object.userSummoned && _.any(roomObjects, i => i.type == 'creep' && i.user != '2' && i.user != roomController.user)) {
        require('./_die')(object, roomObjects, bulk, stats);
    }

    if (object._healToApply) {
        object.hits += object._healToApply;
        if (object.hits > object.hitsMax) {
            object.hits = object.hitsMax;
        }

        require('./_recalc-body')(object);

        bulk.update(object, {
            hits: object.hits,
            body: object.body,
            energyCapacity: object.energyCapacity,
        });

        delete object._healToApply;
    }

    if (object._damageToApply) {
        require('./_damage-body')(object, object._damageToApply, roomObjects, roomTerrain, bulk);
        delete object._damageToApply;

        bulk.update(object, {
            hits: object.hits,
            body: object.body,
            energyCapacity: object.energyCapacity
        });
    }
};