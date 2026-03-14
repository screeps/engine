var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {

    const {roomObjects, roomController, gameTime} = scope;

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning) {
        return;
    }

    var target = roomObjects[intent.id];
    if(!target || target == object) {
        return;
    }
    if(Math.abs(target.x - object.x) > C.RANGE_RANGED_ATTACK || Math.abs(target.y - object.y) > C.RANGE_RANGED_ATTACK) {
        return;
    }
    if(target.type == 'creep' && target.spawning) {
        return;
    }
    if(!target.hits) {
        return;
    }
    if(roomController && roomController.user != object.user && roomController.safeMode > gameTime) {
        return;
    }
    var rampart = _.find(roomObjects, {type: 'rampart', x: target.x, y: target.y});
    if(rampart) {
        target = rampart;
    }


    var attackPower = utils.calcBodyEffectiveness(object.body, C.RANGED_ATTACK, 'rangedAttack', C.RANGED_ATTACK_POWER);

    require('../_damage')(object, target, attackPower, C.EVENT_ATTACK_TYPE_RANGED, scope);

};