var _ = require('lodash'),
    utils =  require('../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, target, damage, damageType, roomObjects, roomTerrain, bulk, roomController, stats, gameTime, roomInfo) {

    if(!target.hits) {
        return;
    }   

    var attackBackPower = 0;

    if(target.type == 'creep') {
        if(damageType == 'melee' && !_.any(roomObjects, {type: 'rampart', x: object.x, y: object.y})) {
            attackBackPower = utils.calcBodyEffectiveness(target.body, C.ATTACK, 'attack', C.ATTACK_POWER);
        }
        target._damageToApply = (target._damageToApply || 0) + damage;
    }
    else {
        target.hits -= damage;
    }

    if(target.type == 'powerBank') {
        attackBackPower = damage * C.POWER_BANK_HIT_BACK;
    }

    if(roomController && roomController.user == object.user && roomController.safeMode > gameTime) {
        attackBackPower = 0;
    }

    if(target.type == 'constructedWall' && target.decayTime) {
        require('./creeps/_clear-newbie-walls')(roomObjects, bulk);
    }
    else if (target.hits <= 0) {
        if (target.type != 'creep') {
            C.RESOURCES_ALL.forEach(resourceType => {
                if (target[resourceType] > 0) {
                    require('./creeps/_create-energy')(target.x, target.y, target.room,
                    target[resourceType], roomObjects, bulk, resourceType);
                }
            });

            bulk.remove(target._id);
            delete roomObjects[target._id];
        }

        if(target.type == 'spawn') {
            if(target.spawning) {
                var spawning = _.find(roomObjects, {user: target.user, name: target.spawning.name});
                if(spawning) {
                    bulk.remove(spawning._id);
                }
            }
        }
    }
    else {
        if (target.type != 'creep') {
            bulk.update(target, {hits: target.hits});
        }
    }
    if(object.actionLog) {
        object.actionLog[object.type == 'creep' && damageType == 'ranged' ? 'rangedAttack' : 'attack'] = {
            x: target.x,
            y: target.y
        };
    }
    if(target.actionLog) {
        target.actionLog.attacked = {x: object.x, y: object.y};
    }

    if(object.user != '2' && object.user != '3') {
        if (target.notifyWhenAttacked) {
            utils.sendAttackingNotification(target, roomController);
        }
        if (roomInfo && object.user && target.user && object.user != target.user && target.user != '2' && target.user != '3') {
            roomInfo.lastPvpTime = gameTime;
        }
    }

    if(attackBackPower) {
        object._damageToApply = (object._damageToApply || 0) + attackBackPower;
        object.actionLog.attacked = {x: target.x, y: target.y};
    }
};

