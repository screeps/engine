const _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {
    const {roomObjects, bulk, roomController, gameTime} = scope;

    if(!!object.cooldownTime && object.cooldownTime > gameTime) {
        return;
    }

    const target = roomObjects[intent.id];
    if(!target || target.type != 'creep' || target.user != object.user) {
        return;
    }
    if(!utils.checkStructureAgainstController(object, roomObjects, roomController)) {
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

    const cooldown = _.reduce(C.RESOURCES_ALL, function(a, r){
        if(!boostedParts[r]) {
            return a;
        }

        const energyReturn = boostedParts[r]*C.LAB_UNBOOST_ENERGY;
        if(energyReturn>0) {
            require('../creeps/_create-energy')(target.x, target.y, target.room, energyReturn, C.RESOURCE_ENERGY, scope);
        }

        const mineralReturn = boostedParts[r]*C.LAB_UNBOOST_MINERAL;
        if(mineralReturn > 0) {
            require('../creeps/_create-energy')(target.x, target.y, target.room, mineralReturn, r, scope);
        }

        return a + boostedParts[r]*utils.calcTotalReactionsTime(r)*C.LAB_UNBOOST_MINERAL/C.LAB_REACTION_AMOUNT;
    }, 0);

    if(cooldown > 0) {
        bulk.update(object, { cooldownTime: cooldown + gameTime });
    }
};
