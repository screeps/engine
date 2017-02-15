var q = require('q'),
    _ = require('lodash'),
    utils = require('./utils'),
    driver = utils.getDriver(),
    config = require('./config');

var usersInRooms, roomNames, usersDone = {}, roomsDone = {}, activeUsers,
    started = false, waitDeferred, roomsQueue, timeout;

driver.listenUserDoneTick((userId) => {
    if(!started) {
        return;
    }
    //console.log('-->', userId);
    usersDone[userId] = true;
    throttledProcess();
});

function doProcess() {

    var add = [], notDone = 0;

    for(var i=0; i<roomNames.length; i++) {
        if(roomsDone[roomNames[i]]) {
            continue;
        }
        var flag = 0, usersInThisRoom = usersInRooms[roomNames[i]];
        for(var j=0; j<usersInThisRoom.length; j++) {
            if(!usersInThisRoom[j]) {
                continue;
            }
            if(!usersDone[usersInThisRoom[j]] && !usersDone[usersInThisRoom[j]+':'+roomNames[i]] &&
                (activeUsers[usersInThisRoom[j]] || usersInThisRoom[j] == '2' || usersInThisRoom[j] == '3')) {
                flag++;
                break;
            }
        }
        if(!flag) {
            //console.log(`! room ${roomNames[i]} done!`);
            roomsDone[roomNames[i]] = true;
            add.push(roomNames[i]);
        }
        else {
            //console.log(`...... room ${roomNames[i]} waiting: ${u.join(',')}`)
            notDone++;
        }
    }

    if(add.length) {
        roomsQueue.addMulti(add);
    }

    if(!notDone) {
        clearTimeout(timeout);
        waitDeferred.resolve();
    }
}

var throttledProcess = _.throttle(doProcess, 50);

function start(rooms, users) {

    return driver.getUsersInRoomPresence(_.map(rooms, '_id'))
        .then(data => {
            usersInRooms = data;            
            usersDone = {};
            activeUsers = {};
            for(var i=0; i<users.length; i++) {
                activeUsers[users[i]._id] = true;
            }
            roomsDone = {};
            roomNames = Object.keys(usersInRooms);
            started = true;
            waitDeferred = q.defer();

            timeout = setTimeout(() => {
                waitDeferred.reject('rooms/users tracker timeout');
                for(var i=0; i<roomNames.length; i++) {
                    if (!roomsDone[roomNames[i]]) {
                        var usersInThisRoom = usersInRooms[roomNames[i]];
                        for(var j=0; j<usersInThisRoom.length; j++) {
                            if(!usersInThisRoom[j]) {
                                continue;
                            }
                            if(!usersDone[usersInThisRoom[j]] && !usersDone[usersInThisRoom[j]+':'+roomNames[i]] &&
                                (activeUsers[usersInThisRoom[j]] || usersInThisRoom[j] == '2' || usersInThisRoom[j] == '3')) {
                                console.log(`!!! room ${roomNames[i]} waiting for ${usersInThisRoom[j]}`);
                                break;
                            }
                        }
                        break;
                    }
                }
            }, driver.config.mainLoopResetInterval);

            doProcess();
        });


}

function wait() {
    return waitDeferred.promise;
}

function stop() {
    started = false;
}

function setRoomsQueue(queue) {
    roomsQueue = queue;
}

exports.start = start;
exports.wait = wait;
exports.stop = stop;
exports.setRoomsQueue = setRoomsQueue;