var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {roomObjects, bulk}) {

    object.store = object.store || {};
    var carry = utils.calcResources(object);

    if(object.spawning || carry >= object.storeCapacity) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target.type != 'energy') {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }

    var resourceType = target.resourceType || 'energy';

    var amount = Math.min(object.storeCapacity - carry, target[resourceType]);

    target[resourceType] -= amount;
    object.store[resourceType] = (object.store[resourceType] || 0) + amount;

    if(!target[resourceType]) {
        bulk.remove(target._id);
        delete roomObjects[target._id];
    }
    else {
        bulk.update(target, {[resourceType]: target[resourceType]});
    }

    bulk.update(object, {store:{[resourceType]: object.store[resourceType]}});
};
