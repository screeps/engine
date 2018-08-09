
module.exports = function(object, objectIntents, scope) {


    if(objectIntents.transfer)
        require('./transfer')(object, objectIntents.transfer, scope);

};