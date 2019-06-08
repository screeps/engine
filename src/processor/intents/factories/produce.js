var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {
    const {gameTime, roomObjects, roomController, bulk} = scope;

    if(!object ||!object.store || !C.COMMODITIES[intent.resourceType] || !!C.COMMODITIES[intent.resourceType].level && object.level != C.COMMODITIES[intent.resourceType].level) {
        return;
    }

    if(!!object.cooldownTime && object.cooldownTime > gameTime) {
        return;
    }

    if(!utils.checkStructureAgainstController(object, roomObjects, roomController)) {
        return;
    }

    if(!!C.COMMODITIES[intent.resourceType].level && (object.level > 0) && !_.some(object.effects, e => e.power == C.PWR_OPERATE_FACTORY && e.level == C.COMMODITIES[intent.resourceType].level && e.endTime >= gameTime)) {
        return;
    }

    if(_.some(_.keys(C.COMMODITIES[intent.resourceType].components), p => (object.store[p]||0)<C.COMMODITIES[intent.resourceType].components[p])) {
        return;
    }

    const targetTotal = utils.calcResources(object);
    const componentsTotal = _.sum(C.COMMODITIES[intent.resourceType].components);
    if (targetTotal - componentsTotal + (C.COMMODITIES[intent.resourceType].amount||1) > object.storeCapacity) {
        return;
    }

    for(let part in C.COMMODITIES[intent.resourceType].components) {
        object.store[part] = object.store[part] - C.COMMODITIES[intent.resourceType].components[part];
    }
    object.store[intent.resourceType] = (object.store[intent.resourceType]||0) + (C.COMMODITIES[intent.resourceType].amount || 1);
    bulk.update(object, {store: object.store});

    object.actionLog.produce = {x: object.x, y: object.y, resourceType: intent.resourceType};

    bulk.update(object, {cooldownTime: C.COMMODITIES[intent.resourceType].cooldown + gameTime});
};
