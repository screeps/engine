var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function dropResourcesWithoutSpace(object, scope) {
    for(var i=0; i<C.RESOURCES_ALL.length; i++) {
        var resourceType = C.RESOURCES_ALL[i];
        var totalAmount = utils.calcResources(object);
        if(totalAmount <= object.storeCapacity) {
            break;
        }
        if(object.store[resourceType]) {
            require('./drop')(object, {amount: Math.min(object.store[resourceType], totalAmount - object.storeCapacity), resourceType}, scope);
        }
    }
};
