#!/usr/bin/env node
var q = require('q'),
    _ = require('lodash'),
    util = require('util'),
    utils = require('./utils'),
    driver = utils.getDriver(),
    C = driver.constants;

function runUser(userId, onlyInRoom) {

    driver.config.emit('runnerLoopStage','runUser', userId, onlyInRoom);

    //driver.influxAccumulator.resetTime();

    return driver.makeRuntime(userId, onlyInRoom)
        .then(saveResult, saveResult);

    function saveResult(runResult) {

        driver.config.emit('runnerLoopStage','saveResultStart', runResult);

        //driver.influxAccumulator.mark('endMakeRuntime');
        if(runResult.console) {
            driver.sendConsoleMessages(userId, runResult.console);
        }

        //driver.resetUserRoomVisibility(userId);

        /*return q.when().then(() => runResult.memory ? driver.saveUserMemory(userId, runResult.memory, onlyInRoom) : undefined)
        .then(() => driver.influxAccumulator.mark('saveUserMemory'))
        .then(() => runResult.intents ? driver.saveUserIntents(userId, runResult.intents) : undefined)
        .then(() => driver.influxAccumulator.mark('saveUserIntents'))
        .then(() => {
            if(runResult.error) {
                return q.reject(runResult.error);
            }
        });*/

        var promises = [];
        if(runResult.memory) {
            promises.push(driver.saveUserMemory(userId, runResult.memory, onlyInRoom));
        }
        if(runResult.memorySegments) {
            promises.push(driver.saveUserMemorySegments(userId, runResult.memorySegments));
        }
        if(runResult.interShardSegment) {
            promises.push(driver.saveUserMemoryInterShardSegment(userId, runResult.interShardSegment));
        }
        if(runResult.intents) {
            promises.push(driver.saveUserIntents(userId, runResult.intents));
        }
        return q.all(promises)
        .then(() => {
            driver.config.emit('runnerLoopStage','saveResultFinish', runResult);
            //driver.influxAccumulator.mark('saveUser');
            if(runResult.error) {
                return q.reject(runResult.error);
            }
        })
    }
}

driver.connect('runner')
.then(() => driver.queue.create('users', 'read'))
.then(_usersQueue => {

    var usersQueue = _usersQueue;

    driver.startLoop('runner', function() {
        var userId, fetchedUserId;

        driver.config.emit('runnerLoopStage','start');

        return usersQueue.fetch()
            .then((_userId) => {
                userId = fetchedUserId = _userId;
                var onlyInRoom;
                var m = userId.match(/^Invader:(.*)$/);
                if(m) {
                    userId = '2';
                    onlyInRoom = m[1];
                }

                return runUser(userId, onlyInRoom);
            })
            .catch((error) => driver.sendConsoleError(userId, error))
            .then(() => usersQueue.markDone(fetchedUserId))
            .catch((error) => console.error('Error in runner loop:', _.isObject(error) && error.stack || error))
            .finally(() => driver.config.emit('runnerLoopStage','finish', userId));
    });

}).catch((error) => {
    console.log('Error connecting to driver:', error);
});


if(typeof self == 'undefined') {
    setInterval(() => {
        var rejections = q.getUnhandledReasons();
        rejections.forEach((i) => console.error('Unhandled rejection:', i));
        q.resetUnhandledRejections();
    }, 1000);
}

