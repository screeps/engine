var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {

    const {bulk} = scope;

    if(!_.contains(C.RESOURCES_ALL, intent.resourceType)) {
        return;
    }
    if(object.spawning || !(object[intent.resourceType] >= intent.amount) ) {
        return;
    }

    if(intent.amount > 0) {
        object[intent.resourceType] -= intent.amount;
        require('./_create-energy')(object.x, object.y, object.room, intent.amount, intent.resourceType, scope);
    }

    bulk.update(object, {[intent.resourceType]: object[intent.resourceType]});
};