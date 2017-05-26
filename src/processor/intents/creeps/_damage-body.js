var _ = require('lodash'),
    utils =  require('../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function damageBody(object, damage, roomObjects, roomTerrain, bulk) {

    let damageReduce = 0, damageEffective = damage;

    if(_.any(object.body, i => !!i.boost)) {
        for(let i=0; i<object.body.length; i++) {
            if(damageEffective <= 0) {
                break;
            }
            let bodyPart = object.body[i], damageRatio = 1;
            if(bodyPart.boost && C.BOOSTS[bodyPart.type][bodyPart.boost] && C.BOOSTS[bodyPart.type][bodyPart.boost].damage) {
                damageRatio = C.BOOSTS[bodyPart.type][bodyPart.boost].damage;
            }
            let bodyPartHitsEffective = bodyPart.hits / damageRatio;
            damageReduce += Math.min(bodyPartHitsEffective, damageEffective) * (1 - damageRatio);
            damageEffective -= Math.min(bodyPartHitsEffective, damageEffective);
        }
    }

    damage -= Math.round(damageReduce);

    object.hits -= damage;

    require('./creeps/_recalc-body')(object);

    require('./creeps/_drop-resources-without-space')(object, roomObjects, roomTerrain, bulk);
};