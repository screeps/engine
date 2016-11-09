var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats, gameTime, roomInfo) {

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
    if(Math.abs(target.x - object.x) > 1 || Math.abs(target.y - object.y) > 1) {
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

    var attackPower = utils.calcBodyEffectiveness(object.body, C.ATTACK, 'attack', C.ATTACK_POWER);

    require('../_damage')(object, target, attackPower, 'melee', roomObjects, roomTerrain, bulk, roomController, stats, gameTime, roomInfo);

    object._attack = true;


};