module.exports = function(object, objectIntents, scope) {
    if(objectIntents.transfer)
        require('./transfer')(object, objectIntents.transfer, scope);

    if(objectIntents.createCreep)
        require('./create-creep')(object, objectIntents.createCreep, scope);

    if(objectIntents.reserveController)
        require('./reserveController')(object, objectIntents.reserveController, scope);
};
