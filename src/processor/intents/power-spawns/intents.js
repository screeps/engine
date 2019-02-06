module.exports = function(object, objectIntents, scope) {

    if(objectIntents.processPower)
        require('./process-power')(object, objectIntents.processPower, scope);

    if(objectIntents.renewPowerCreep)
        require('./renew-power-creep')(object, objectIntents.renewPowerCreep, scope);

};