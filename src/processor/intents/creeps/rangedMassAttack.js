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

    var attackPower = utils.calcBodyEffectiveness(object.body, C.RANGED_ATTACK, 'rangedMassAttack', C.RANGED_ATTACK_POWER);

    if(attackPower == 0) {
        return;
    }
    if(roomController && roomController.user != object.user && roomController.safeMode > gameTime) {
        return;
    }

    var targets = _.filter(roomObjects, (i) => {
        return (!_.isUndefined(i.user) || i.type == 'powerBank') && i.user != object.user &&
            i.x >= object.x - 3 && i.x <= object.x + 3 &&
            i.y >= object.y - 3 && i.y <= object.y + 3;
    });

    var distanceRate = {0: 2, 1: 1, 2: 0.4, 3: 0.1};

    for(var i in targets) {

        var target = targets[i];

        if(target.type != 'rampart' && _.find(roomObjects, {type: 'rampart', x: target.x, y: target.y})) {
            continue;
        }
        if(!target.hits) {
            continue;
        }

        var distance = Math.max(Math.abs(object.x - target.x), Math.abs(object.y - target.y));

        var targetAttackPower = Math.round(attackPower * distanceRate[distance]);

        require('../_damage')(object, target, targetAttackPower, 'ranged', roomObjects, roomTerrain, bulk, roomController, stats, gameTime, roomInfo);
    }

    object.actionLog.rangedMassAttack = {};
};