
module.exports = function(object, objectIntents, scope) {

    if(objectIntents.runReaction)
        require('./run-reaction')(object, objectIntents.runReaction, scope);

    if(objectIntents.reverseReaction)
        require('./reverse-reaction')(object, objectIntents.reverseReaction, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats);

    if(objectIntents.boostCreep)
        require('./boost-creep')(object, objectIntents.boostCreep, scope);

    if(objectIntents.unboostCreep)
        require('./unboost-creep')(object, objectIntents.unboostCreep, scope);
};
