
module.exports = function(object, objectIntents, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime, roomInfo) {


    if(objectIntents.transfer)
        require('./transfer')(object, objectIntents.transfer, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats);

    if(objectIntents.heal)
        require('./heal')(object, objectIntents.heal, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats);
    else if(objectIntents.repair)
        require('./repair')(object, objectIntents.repair, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats);
    else if(objectIntents.attack)
        require('./attack')(object, objectIntents.attack, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime, roomInfo);


};