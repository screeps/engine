var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

module.exports = function(object, scope) {

    const {roomObjects, bulk, roomController, gameTime, eventLog} = scope;

    if(!object || object.type != 'powerCreep') return;


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

    var portal = _.find(roomObjects, i => i.type == 'portal' && i.x == object.x && i.y == object.y);
    if (portal && !portal.destination.shard) {
        bulk.update(object, {interRoom: portal.destination});
    }

    let hits = object.hits;

    if (object._damageToApply) {
        hits -= object._damageToApply;
        delete object._damageToApply;
    }

    if (object._healToApply) {
        hits += object._healToApply;
        delete object._healToApply;
    }

    if(hits > object.hitsMax) {
        hits = object.hitsMax;
    }

    if(hits != object.hits) {
        bulk.update(object, {hits});
    }

    if(!_.isEqual(object.actionLog, object._actionLog)) {
        bulk.update(object, {actionLog: object.actionLog});
    }

};
