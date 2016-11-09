module.exports = function(object, objectIntents, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime) {

    if(objectIntents.processPower)
        require('./process-power')(object, objectIntents.createCreep, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats);

};