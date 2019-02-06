var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {bulk, gameTime}) {

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

    var effect = _.find(object.effects, {power: C.PWR_OPERATE_TERMINAL});
    if(effect && effect.endTime >= gameTime) {
        cost = Math.ceil(cost * C.POWER_INFO[C.PWR_OPERATE_TERMINAL].effect[effect.level-1]);
    }

    if(intent.resourceType != C.RESOURCE_ENERGY && object.energy < cost ||
        intent.resourceType == C.RESOURCE_ENERGY && object.energy < intent.amount + cost) {
        return;
    }

    bulk.update(object, {send: intent});
};