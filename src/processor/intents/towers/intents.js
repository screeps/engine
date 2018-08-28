
module.exports = function(object, objectIntents, scope) {

    if(objectIntents.transfer)
        require('./transfer')(object, objectIntents.transfer, scope);

    if(objectIntents.heal)
        require('./heal')(object, objectIntents.heal, scope);
    else if(objectIntents.repair)
        require('./repair')(object, objectIntents.repair, scope);
    else if(objectIntents.attack)
        require('./attack')(object, objectIntents.attack, scope);
};