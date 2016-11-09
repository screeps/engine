var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, roomObjects, roomTerrain, bulk, bulkUsers, roomController, gameTime) {

    if(!object || object.type != 'constructedWall') return;

    if(roomController && !object.newbieWall) {
        var hitsMax = C.CONTROLLER_STRUCTURES.constructedWall[roomController.level] ? C.WALL_HITS_MAX : 0;
        if(hitsMax != object.hitsMax) {
            bulk.update(object, {hitsMax});
        }
    }

    if(object.ticksToLive > 0) {
        bulk.update(object, {
            decayTime: gameTime + object.ticksToLive,
            ticksToLive: null
        });
    }

    if(!object.decayTime) {
        return;
    }

    if(!_.isObject(object.decayTime)) {
        if (gameTime >= object.decayTime - 1 || roomController && !roomController.user) {
            bulk.remove(object._id);
            delete roomObjects[object._id];
        }

        if (object.user && gameTime == object.decayTime - 5000) {
            driver.sendNotification(object.user, "Attention! Your room protection will be removed soon.\nLearn how to defend your room against intruders from <a href='http://support.screeps.com/hc/en-us/articles/203339002-Defending-your-room'>this article</a>.");
        }
    }

    if(_.isObject(object.decayTime)) {
        if(Date.now() > object.decayTime.timestamp) {
            bulk.remove(object._id);
            delete roomObjects[object._id];
        }
    }

};