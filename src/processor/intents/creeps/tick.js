var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

function _applyDamage(object, damage) {

    let damageReduce = 0, damageEffective = damage;

    if(_.any(object.body, i => !!i.boost)) {
        for(let i=0; i<object.body.length; i++) {
            if(damageEffective <= 0) {
                break;
            }
            let bodyPart = object.body[i], damageRatio = 1;
            if(bodyPart.boost && C.BOOSTS[bodyPart.type][bodyPart.boost] && C.BOOSTS[bodyPart.type][bodyPart.boost].damage) {
                damageRatio = C.BOOSTS[bodyPart.type][bodyPart.boost].damage;
            }
            let bodyPartHitsEffective = bodyPart.hits / damageRatio;
            damageReduce += Math.min(bodyPartHitsEffective, damageEffective) * (1 - damageRatio);
            damageEffective -= Math.min(bodyPartHitsEffective, damageEffective);
        }
    }

    damage -= Math.round(damageReduce);

    object.hits -= damage;
}

module.exports = function(object, scope) {

    const {roomObjects, bulk, roomController, gameTime, eventLog} = scope;

    if(!object || object.type != 'creep') return;

    if(object.spawning) {
        var spawn = _.find(roomObjects, {type: 'spawn', x: object.x, y: object.y});
        if(!spawn) {
            bulk.remove(object._id);
            delete roomObjects[object._id];
        }
        else {
            if(!spawn.spawning || spawn.spawning.name != object.name) {
                require('../spawns/_born-creep')(spawn, object, scope);
            }
        }
    }
    else {
        movement.execute(object, scope);

        if(utils.isAtEdge(object) && object.user != '2' && object.user != '3') {
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

            eventLog.push({event: C.EVENT_EXIT, objectId: object._id, data: {room, x, y}});
        }

        if(object.ageTime) { // since NPC creeps may appear right on portals without `ageTime` defined at the first tick
            var portal = _.find(roomObjects, i => i.type == 'portal' && i.x == object.x && i.y == object.y);
            if (portal) {
                bulk.update(object, {interRoom: portal.destination});
            }
        }

        if(!object.tutorial) {
            if(!object.ageTime) {
                object.ageTime = gameTime + (_.any(object.body, {type: C.CLAIM}) ? C.CREEP_CLAIM_LIFE_TIME : C.CREEP_LIFE_TIME);
                bulk.update(object, {ageTime: object.ageTime});
            }

            if(gameTime >= object.ageTime-1) {
                require('./_die')(object, undefined, false, scope);
            }
        }

        if(!_.isEqual(object.actionLog, object._actionLog)) {
            bulk.update(object, {actionLog: object.actionLog});
        }

    }


    const moves = utils.calcBodyEffectiveness(object.body, C.MOVE, 'fatigue', 1);
    if(moves > 0) {
        require('./_add-fatigue')(object, -2*moves, scope);
    }

    if(_.isNaN(object.hits) || object.hits <= 0) {
        require('./_die')(object, undefined, true, scope);
    }

    if(object.userSummoned && _.any(roomObjects, i => i.type == 'creep' && i.user != '2' && i.user != roomController.user)) {
        require('./_die')(object, undefined, false, scope);
    }

    let oldHits = object.hits;

    if (object._damageToApply) {
        _applyDamage(object, object._damageToApply);
        delete object._damageToApply;
    }

    if (object._healToApply) {
        object.hits += object._healToApply;
        delete object._healToApply;
    }

    if(object.hits > object.hitsMax) {
        object.hits = object.hitsMax;
    }

    if(object.hits <= 0) {
        require('./_die')(object, undefined, true, scope);
    }
    else if(object.hits != oldHits) {

        require('./_recalc-body')(object);

        if(object.hits < oldHits) {
            require('./_drop-resources-without-space')(object, scope);
        }

        bulk.update(object, {
            hits: object.hits,
            body: object.body,
            storeCapacity: object.storeCapacity
        });
    }
};
