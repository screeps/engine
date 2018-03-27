var q = require('q'),
    _ = require('lodash'),
    utils = require('../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    marketProcessor = require('./market');

module.exports = () => {

    return driver.getInterRoom().then((data) => {
        if(!data) {
            return;
        }

        var [gameTime,creeps,accessibleRooms,terminals,market] = data;

        var bulkObjects1 = driver.bulkObjectsWrite(),
            bulkObjects2 = driver.bulkObjectsWrite(),
            bulkRooms = driver.bulkRoomsWrite(),
            activateRooms = {},
            userRoomVisibility = {},
            visibilityPromises = [q.when()];

        // creeps

        creeps.forEach((creep) => {
            if(!accessibleRooms[creep.interRoom.room]) {
                return;
            }
            if(!activateRooms[creep.interRoom.room]) {
                bulkRooms.update(creep.interRoom.room, {active: true});
            }
            activateRooms[creep.interRoom.room] = true;
            bulkObjects1.remove(creep._id);
            creep.room = creep.interRoom.room;
            creep.x = creep.interRoom.x;
            creep.y = creep.interRoom.y;
            creep.interRoom = undefined;
            bulkObjects2.insert(creep, creep._id);

            userRoomVisibility[creep.user] = userRoomVisibility[creep.user] || {};
            userRoomVisibility[creep.user][creep.room] = true;
        });

        for(var user in userRoomVisibility) {
            for(var room in userRoomVisibility[user]) {
                visibilityPromises.push(driver.setUserRoomVisibility(user, room));
            }
        }

        return marketProcessor.execute(market, gameTime, terminals, bulkObjects1)
        .then(() => q.all([bulkObjects1.execute(), bulkRooms.execute()].concat(visibilityPromises)))
        .then(() => bulkObjects2.execute());
    });
};

