var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {bulk}) {

    if(!/^(W|E)\d+(N|S)\d+$/.test(intent.targetRoomName)) {
        return;
    }

    if(!_.contains(C.RESOURCES_ALL, intent.resourceType)) {
        return;
    }
    if(!intent.amount || !(object[intent.resourceType] >= intent.amount)) {
        return;
    }

    var range = utils.calcRoomsDistance(object.room, intent.targetRoomName, true);
    var cost = utils.calcTerminalEnergyCost(intent.amount, range);

    if(intent.resourceType != C.RESOURCE_ENERGY && object.energy < cost ||
        intent.resourceType == C.RESOURCE_ENERGY && object.energy < intent.amount + cost) {
        return;
    }

    bulk.update(object, {send: intent});
};