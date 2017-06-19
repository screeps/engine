module.exports = function(object, objectIntents, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime) {

    if(objectIntents.createCreep)
        require('./create-creep')(object, objectIntents.createCreep, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats);

	if(objectIntents.spawnCreep)
		require('./spawn-creep')(object, objectIntents.spawnCreep, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime);

    if(objectIntents.transferEnergy)
        require('./transfer-energy')(object, objectIntents.transferEnergy, roomObjects, roomTerrain, bulk, bulkUsers, roomController);

    if(objectIntents.renewCreep)
        require('./renew-creep')(object, objectIntents.renewCreep, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime);

	if(objectIntents.recycleCreep)
		require('./recycle-creep')(object, objectIntents.recycleCreep, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime);

};