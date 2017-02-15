#!/usr/bin/env node
var q = require('q'),
    _ = require('lodash'),
    usersQueue, roomsQueue,
    utils = require('./utils'),
    driver = utils.getDriver(),
    config = require('./config'),
    roomsUsersTracker = require('./rooms-users-tracker');

var lastAccessibleRoomsUpdate = 0;

function loop() {

    var resetInterval, startLoopTime = process.hrtime ? process.hrtime() : Date.now(),
        stage = 'start';

    driver.config.emit('mainLoopStage',stage);

    if(typeof self == 'undefined') {
        resetInterval = setInterval(() => {
            console.error('Main loop reset! Stage:',stage);
            driver.queue.resetAll();
        }, driver.config.mainLoopResetInterval);
    }

    driver.notifyTickStarted()
        .then(() => {
            stage = 'getUsers';
            driver.config.emit('mainLoopStage',stage);
            return q.all([
                driver.getAllRooms(),
                driver.getAllUsers()
            ]);
        })
        .then((data) => {
            stage = 'addUsersToQueue';

            var [rooms, users] = data;

            driver.config.emit('mainLoopStage',stage, users);

            return roomsUsersTracker.start(rooms, users)
                .then(() => q.all([
                    usersQueue.addMulti(_.map(users, (user) => user._id.toString())),
                    roomsUsersTracker.wait()
                ]));
        })
        .then(() => {
            stage = 'waitForRooms';
            driver.config.emit('mainLoopStage',stage);
            return roomsQueue.whenAllDone();
        })
        .then(() => {
            roomsUsersTracker.stop();
            stage = 'commit1';
            driver.config.emit('mainLoopStage',stage);
            return driver.commitDbBulk();
        })
        .then(() => {
            stage = 'global';
            driver.config.emit('mainLoopStage',stage);
            return require('./processor/global')();
        })
        .then(() => {
            stage = 'commit2';
            driver.config.emit('mainLoopStage',stage);
            return driver.commitDbBulk();
        })
        .then(() => {
            stage = 'incrementGameTime';
            driver.config.emit('mainLoopStage',stage);
            return driver.incrementGameTime()
        })
        .then(gameTime => {
            console.log('Game time set to', gameTime);
            if(+gameTime > lastAccessibleRoomsUpdate + 20) {
                driver.updateAccessibleRoomsList();
                lastAccessibleRoomsUpdate = +gameTime;
            }

            stage = 'notifyRoomsDone';
            driver.config.emit('mainLoopStage',stage);
            return driver.notifyRoomsDone(gameTime);
        })
        .then(() => {
            stage = 'custom';
            driver.config.emit('mainLoopStage',stage);
            return driver.config.mainLoopCustomStage();
        })
        .catch((error) => {
            if(error == 'Simulation paused') {
                return;
            }
            console.error(`Error while main loop (stage ${stage}):`, _.isObject(error) && error.stack ? error.stack : error);
        })
        .finally(() => {

            if(resetInterval) {
                clearInterval(resetInterval);
            }

            var usedTime;
            if (process.hrtime) {
                usedTime = process.hrtime(startLoopTime);
                usedTime = usedTime[0] * 1e3 + usedTime[1] / 1e6;
            }
            else {
                usedTime = Date.now() - startLoopTime;
            }

            driver.config.emit('mainLoopStage','finish');

            setTimeout(loop, Math.max(driver.config.mainLoopMinDuration - usedTime, 0));
        })
        .catch((error) => {
            console.error(`'Error while main loop (final):`, _.isObject(error) && error.stack ? error.stack : error);
        });

}

driver.connect('main')
    .then(() =>  q.all([
        driver.queue.create('users', 'write'),
        driver.queue.create('rooms', 'write')
    ]))
    .then((data) => {
        usersQueue = data[0];
        roomsQueue = data[1];
        roomsUsersTracker.setRoomsQueue(roomsQueue);
        loop();
    })
    .catch((error) => console.log('Error connecting to driver:', error));

if(typeof self == 'undefined') {
    setInterval(() => {
        var rejections = q.getUnhandledReasons();
        rejections.forEach((i) => console.error('Unhandled rejection:', i));
        q.resetUnhandledRejections();
    }, 1000);
}