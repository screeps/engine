
module.exports = function(object, objectIntents, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats) {


    if(objectIntents.transfer)
        require('./transfer')(object, objectIntents.transfer, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats);

};