var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(x, y, room, amount, roomObjects, bulk, resourceType) {

    resourceType = resourceType || 'energy';

    amount = Math.round(amount);

    if(amount <= 0) {
        return;
    }

    var container = _.find(roomObjects, {type: 'container', x, y});

    if(container && container.hits > 0) {
        var targetTotal = utils.calcResources(container);
        var toContainerAmount = Math.min(amount, container.energyCapacity - targetTotal);
        if(toContainerAmount > 0) {
            container[resourceType] = container[resourceType] || 0;
            container[resourceType] += toContainerAmount;
            bulk.update(container, {[resourceType]: container[resourceType]});
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
            bulk.insert({
                type: 'energy',
                x, y,
                room: room,
                [resourceType]: amount,
                resourceType
            })
        }
    }
};