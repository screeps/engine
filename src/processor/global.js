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

        var bulk = driver.bulkObjectsWrite(),
            bulkRooms = driver.bulkRoomsWrite(),
            activateRooms = {};

        // creeps

        creeps.forEach((creep) => {
            if(!accessibleRooms[creep.interRoom.room]) {
                return;
            }
            if(!activateRooms[creep.interRoom.room]) {
                bulkRooms.update(creep.interRoom.room, {active: true});
            }
            activateRooms[creep.interRoom.room] = true;

            bulk.update(creep, {room: creep.interRoom.room, x: creep.interRoom.x, y: creep.interRoom.y, interRoom: null});
        });

        return marketProcessor.execute(market, gameTime, terminals, bulk)
        .then(() => q.all([bulk.execute(), bulkRooms.execute()]));
    });
};

