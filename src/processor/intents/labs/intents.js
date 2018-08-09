
module.exports = function(object, objectIntents, {roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats}) {


    if(objectIntents.transfer)
        require('./transfer')(object, objectIntents.transfer, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats);

    if(objectIntents.runReaction)
        require('./run-reaction')(object, objectIntents.runReaction, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats);

    if(objectIntents.boostCreep)
        require('./boost-creep')(object, objectIntents.boostCreep, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats);
};