var q = require('q'),
    _ = require('lodash'),
    utils = require('./utils'),
    driver = utils.getDriver();

var currentHistoryPromise = q.when();

exports.buildHistoryPayload = function(roomObjects) {
    var historyPayload = {};
    _.forEach(roomObjects, (object) => {
        if (!object || object.type === 'flag') {
            return;
        }
        if (object.type === 'creep' || object.type === 'powerCreep') {
            var clone = JSON.parse(JSON.stringify(object));
            clone._id = '' + object._id;
            if (clone.actionLog && clone.actionLog.say && !clone.actionLog.say.isPublic) {
                delete clone.actionLog.say;
            }
            historyPayload[clone._id] = clone;
        } else {
            historyPayload[object._id] = object;
        }
    });
    return historyPayload;
};

exports.saveRoomHistory = function(roomId, objects, gameTime) {

    var data = JSON.stringify(objects);
    var chunkSize = driver.config.historyChunkSize;

    return currentHistoryPromise.then(() => {
        var promise = q.when();

        if (!(gameTime % chunkSize)) {
            var prevBase = Math.floor((gameTime - 1) / chunkSize) * chunkSize;
            promise = driver.history.upload(roomId, prevBase);
        }

        var baseTime = gameTime - (gameTime % chunkSize);
        currentHistoryPromise = promise.then(() => driver.history.saveTick(roomId, gameTime, data)
            .then(() => driver.history.markPendingHistory(roomId, baseTime)));
        return currentHistoryPromise;
    });
};

exports.uploadPendingChunks = function(gameTime, processedRooms) {
    var chunkSize = driver.config.historyChunkSize;
    if ((gameTime - 1) % chunkSize) {
        return q.when();
    }
    var prevBase = Math.floor((gameTime - 2) / chunkSize) * chunkSize;
    if (prevBase < 0) {
        return q.when();
    }
    var skip = {};
    _.forEach(processedRooms, roomId => {
        skip[roomId] = true;
    });
    return driver.history.takePendingHistory(prevBase)
        .then(rooms => q.all(_.map(rooms || [], roomId => {
            if (skip[roomId]) {
                return;
            }
            return driver.history.upload(roomId, prevBase);
        })));
};

exports.saveDeactivatedRoomsHistory = function(processedRooms, gameTime) {
    if (!processedRooms || !processedRooms.length) {
        return q.when();
    }
    return driver.getActiveRooms()
        .then(active => {
            var stillActive = {};
            _.forEach(active || [], roomId => {
                stillActive[roomId] = true;
            });
            var deactivated = _.filter(processedRooms, roomId => !stillActive[roomId]);
            return q.all(_.map(deactivated, roomId =>
                driver.getRoomObjects(roomId).then(result =>
                    exports.saveRoomHistory(roomId, exports.buildHistoryPayload(result && result.objects), gameTime)
                )
            ));
        });
};
