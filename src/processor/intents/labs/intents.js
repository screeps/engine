
module.exports = function(object, objectIntents, scope) {


    if(objectIntents.transfer)
        require('./transfer')(object, objectIntents.transfer, scope);

    if(objectIntents.runReaction)
        require('./run-reaction')(object, objectIntents.runReaction, scope);

    if(objectIntents.boostCreep)
        require('./boost-creep')(object, objectIntents.boostCreep, scope);
};