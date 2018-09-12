const _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {
    const {roomObjects, bulk} = scope;
    const target = roomObjects[intent.id];
    if(!target || target.type != 'creep' || target.user != object.user) {
        return;
    }
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
        return;
    }
    const boostedParts = _.mapValues(_.groupBy(_.filter(target.body,p=>!!p.boost), 'boost'), v=>v.length);
    if(!_.some(boostedParts)) {
        return;
    }
    
    target.body.forEach(function(p) {p.boost = null;});
    require('../creeps/_recalc-body')(target);
    bulk.update(target, {body: target.body, energyCapacity: target.energyCapacity});

    C.RESOURCES_ALL.forEach(function(r){
        if(!boostedParts[r]) {
            return;
        }
        
        const energyReturn = boostedParts[r]*C.LAB_UNBOOST_ENERGY;
        if(energyReturn>0) {
            require('../creeps/_create-energy')(target.x, target.y, target.room, energyReturn, C.RESOURCE_ENERGY, scope);
        }

        const mineralReturn = boostedParts[r]*C.LAB_UNBOOST_MINERAL;
        if(mineralReturn > 0) {
            require('../creeps/_create-energy')(target.x, target.y, target.room, mineralReturn, r, scope);
        }
    });
};