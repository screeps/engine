module.exports = function(object, objectIntents, scope) {

    if(objectIntents.processPower)
        require('./process-power')(object, objectIntents.createCreep, scope);

};