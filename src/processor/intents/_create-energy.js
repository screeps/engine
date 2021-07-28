var _ = require('lodash'),
    utils =  require('../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(x, y, room, amount, resourceType, scope) {

    const {roomObjects, bulk} = scope;



    resourceType = resourceType || 'energy';

    amount = Math.round(amount);

    if(amount <= 0) {
        return;
    }

    var container = _.find(roomObjects, {type: 'container', x, y});

    if(container && container.hits > 0) {
        container.store = container.store || {};
        var targetTotal = utils.calcResources(container);
        var toContainerAmount = Math.min(amount, container.storeCapacity - targetTotal);
        if(toContainerAmount > 0) {
            container.store[resourceType] = (container.store[resourceType] || 0) + toContainerAmount;
            bulk.update(container, {store: {[resourceType]: container.store[resourceType]}});
            amount -= toContainerAmount;
        }
    }

    if(amount > 0) {

        var existingDrop = _.find(roomObjects, {type: 'energy', x, y, resourceType});
        if (existingDrop) {
            bulk.update(existingDrop, {
                [resourceType]: existingDrop[resourceType] + amount
            });
        }
        else {
            const obj = {
                type: 'energy',
                x, y,
                room: room,
                [resourceType]: amount,
                resourceType
            };
            obj._id = bulk.insert(obj);
            roomObjects[obj._id] = obj;
        }
    }
};
