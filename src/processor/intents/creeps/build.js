var _ = require('lodash'),
    config = require('../../../config'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

var createdStructureCounter = 0;

module.exports = function(object, intent, {roomObjects, roomTerrain, bulk, roomController, stats, gameTime, eventLog}) {

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning || object.energy <= 0) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'constructionSite' ||
        !C.CONSTRUCTION_COST[target.structureType]) {
        return;
    }
    if(Math.abs(target.x - object.x) > 3 || Math.abs(target.y - object.y) > 3) {
        return;
    }
    if(_.any(roomObjects, {x: target.x, y: target.y, type: target.structureType})) {
        return;
    }
    if(_.contains(C.OBSTACLE_OBJECT_TYPES, target.structureType) &&
        (_.any(roomObjects, (i) => i.x == target.x && i.y == target.y && _.contains(C.OBSTACLE_OBJECT_TYPES, i.type)))) {
        return;
    }

    if(target.structureType != 'extractor' && utils.checkTerrain(roomTerrain, target.x, target.y, C.TERRAIN_MASK_WALL)) {
        return;
    }

    var buildPower = _.filter(object.body, (i) => (i.hits > 0 || i._oldHits > 0) && i.type == C.WORK).length * C.BUILD_POWER || 0,
        buildRemaining = target.progressTotal - target.progress,
        buildEffect = Math.min(buildPower, buildRemaining, object.energy),
        boostedParts = _.map(object.body, i => {
            if(i.type == C.WORK && i.boost && C.BOOSTS[C.WORK][i.boost].build > 0) {
                return (C.BOOSTS[C.WORK][i.boost].build-1) * C.BUILD_POWER;
            }
            return 0;
        });

    boostedParts.sort((a,b) => b-a);
    boostedParts = boostedParts.slice(0,buildEffect);

    var boostedEffect = Math.min(Math.floor(buildEffect + _.sum(boostedParts)), buildRemaining);


    if(target.progress + boostedEffect >= target.progressTotal && !target.tutorial && !utils.checkControllerAvailability(target.structureType, roomObjects, roomController, 1)) {
        return;
    }

    target.progress += boostedEffect;
    object.energy -= buildEffect;

    stats.inc('energyConstruction', object.user, buildEffect);

    object.actionLog.build = {x: target.x, y: target.y};
    bulk.update(object, {energy: object.energy});

    eventLog.push({event: C.EVENT_BUILD, objectId: object._id, data: {targetId: target._id, amount: boostedEffect}});

    if(target.progress < target.progressTotal) {
        bulk.update(target, {
            progress: target.progress
        });
    }
    else {
        bulk.remove(target._id);

        var newObject = {
            type: target.structureType,
            x: target.x,
            y: target.y,
            room: target.room,
            notifyWhenAttacked: true
        };

        if (target.structureType == 'spawn') {
            _.extend(newObject, {
                name: target.name,
                user: target.user,
                energy: 0,
                energyCapacity: C.SPAWN_ENERGY_CAPACITY,
                hits: C.SPAWN_HITS,
                hitsMax: C.SPAWN_HITS
            });
        }

        if (target.structureType == 'extension') {
            _.extend(newObject, {
                user: target.user,
                energy: 0,
                energyCapacity: 0,
                hits: C.EXTENSION_HITS,
                hitsMax: C.EXTENSION_HITS
            });
        }

        if (target.structureType == 'link') {
            _.extend(newObject, {
                user: target.user,
                energy: 0,
                energyCapacity: C.LINK_CAPACITY,
                cooldown: 0,
                hits: C.LINK_HITS,
                hitsMax: C.LINK_HITS_MAX
            });
        }

        if (target.structureType == 'storage') {
            _.extend(newObject, {
                user: target.user,
                energy: 0,
                energyCapacity: C.STORAGE_CAPACITY,
                hits: C.STORAGE_HITS,
                hitsMax: C.STORAGE_HITS
            });
        }

        if (target.structureType == 'rampart') {
            _.extend(newObject, {
                user: target.user,
                hits: C.RAMPART_HITS,
                hitsMax: C.RAMPART_HITS,
                nextDecayTime: gameTime + C.RAMPART_DECAY_TIME
            });
        }

        if (target.structureType == 'road') {
            var hits = C.ROAD_HITS;

            if(_.any(roomObjects, {x: target.x, y: target.y, type: 'swamp'}) ||
                utils.checkTerrain(roomTerrain, target.x, target.y, C.TERRAIN_MASK_SWAMP)) {
                hits *= C.CONSTRUCTION_COST_ROAD_SWAMP_RATIO;
            }
            _.extend(newObject, {
                hits,
                hitsMax: hits
            });
        }

        if (target.structureType == 'constructedWall') {
            _.extend(newObject, {
                hits: C.WALL_HITS,
                hitsMax: C.WALL_HITS_MAX
            });
        }

        if (target.structureType == 'tower') {
            _.extend(newObject, {
                user: target.user,
                energy: 0,
                energyCapacity: C.TOWER_CAPACITY,
                hits: C.TOWER_HITS,
                hitsMax: C.TOWER_HITS
            });
        }

        if (target.structureType == 'observer') {
            _.extend(newObject, {
                user: target.user,
                hits: C.OBSERVER_HITS,
                hitsMax: C.OBSERVER_HITS
            });
        }

        if (target.structureType == 'extractor') {
            _.extend(newObject, {
                user: target.user,
                hits: C.EXTRACTOR_HITS,
                hitsMax: C.EXTRACTOR_HITS
            });
        }

        if (target.structureType == 'lab') {
            _.extend(newObject, {
                user: target.user,
                hits: C.LAB_HITS,
                hitsMax: C.LAB_HITS,
                mineralAmount: 0,
                cooldown: 0,
                mineralType: null,
                mineralCapacity: C.LAB_MINERAL_CAPACITY,
                energy: 0,
                energyCapacity: C.LAB_ENERGY_CAPACITY
            });
        }

        if (target.structureType == 'powerSpawn') {
            _.extend(newObject, {
                user: target.user,
                power: 0,
                powerCapacity: C.POWER_SPAWN_POWER_CAPACITY,
                energy: 0,
                energyCapacity: C.POWER_SPAWN_ENERGY_CAPACITY,
                hits: C.POWER_SPAWN_HITS,
                hitsMax: C.POWER_SPAWN_HITS
            });
        }

        if (target.structureType == 'terminal') {
            _.extend(newObject, {
                user: target.user,
                energy: 0,
                energyCapacity: C.TERMINAL_CAPACITY,
                hits: C.TERMINAL_HITS,
                hitsMax: C.TERMINAL_HITS
            });
        }

        if (target.structureType == 'container') {
            _.extend(newObject, {
                energy: 0,
                energyCapacity: C.CONTAINER_CAPACITY,
                hits: C.CONTAINER_HITS,
                hitsMax: C.CONTAINER_HITS,
                nextDecayTime: gameTime + C.CONTAINER_DECAY_TIME
            });
        }

        if (target.structureType == 'nuker') {
            _.extend(newObject, {
                user: target.user,
                energy: 0,
                energyCapacity: config.ptr ? 1 : C.NUKER_ENERGY_CAPACITY,
                G: 0,
                GCapacity: config.ptr ? 1 : C.NUKER_GHODIUM_CAPACITY,
                hits: C.NUKER_HITS,
                hitsMax: C.NUKER_HITS,
                cooldownTime: gameTime + (config.ptr ? 100 : C.NUKER_COOLDOWN)
            });
        }

        bulk.insert(newObject);

        roomObjects['createdStructure'+createdStructureCounter] = newObject;
        createdStructureCounter++;

        /*if(target.structureType == 'spawn') {
            for(var dx=-1; dx<=1; dx++) {
                for(var dy=-1; dy<=1; dy++) {
                    if(dx == 0 && dy == 0) {
                        continue;
                    }
                    if(_.any(roomObjects, {x: target.x + dx, y: target.y, type: target.structureType})) {
                        continue;
                    }
                    bulk.insert({
                        type: 'rampart',
                        x: target.x + dx,
                        y: target.y + dy,
                        room: target.room,
                        user: target.user,
                        hits: C.RAMPART_HITS,
                        hitsMax: C.RAMPART_HITS,
                        ticksToDecay: C.RAMPART_DECAY_TIME
                    })
                }
            }
        }*/

        delete roomObjects[intent.id];
    }

};