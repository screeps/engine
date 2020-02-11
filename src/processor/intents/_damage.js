var _ = require('lodash'),
    utils =  require('../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, target, damage, attackType, scope) {

    const {roomObjects, bulk, roomController, gameTime, roomInfo, eventLog} = scope;

    if(!target._id || !target.hits) {
        return;
    }

    var attackBackPower = 0;

    if(target.type == 'creep') {
        if(attackType == C.EVENT_ATTACK_TYPE_MELEE && !_.any(roomObjects, {type: 'rampart', x: object.x, y: object.y})) {
            attackBackPower = utils.calcBodyEffectiveness(target.body, C.ATTACK, 'attack', C.ATTACK_POWER);
        }
        target._damageToApply = (target._damageToApply || 0) + damage;
    }
    else if(target.type == 'powerCreep') {
        target._damageToApply = (target._damageToApply || 0) + damage;
    }
    else {
        if(attackType != C.EVENT_ATTACK_TYPE_NUKE && (target.type == 'constructedWall' || target.type == 'rampart')) {
            const effect = _.find(target.effects, e => (e.power == C.PWR_FORTIFY || e.effect == C.EFFECT_INVULNERABILITY) && (e.endTime > gameTime));
            if(effect) {
                return;
            }
        }
        target.hits -= damage;
    }

    if(target.type == 'powerBank') {
        attackBackPower = damage * C.POWER_BANK_HIT_BACK;
    }

    if(roomController && roomController.user == object.user && roomController.safeMode > gameTime) {
        attackBackPower = 0;
    }

    if(target.type == 'constructedWall' && target.decayTime) {
        require('./creeps/_clear-newbie-walls')(scope);
    }
    else if (target.hits <= 0) {
        if (target.type != 'creep' && target.type != 'powerCreep') {

            require('./structures/_destroy')(target, scope, attackType);

            eventLog.push({event: C.EVENT_OBJECT_DESTROYED, objectId: target._id, data: {
                type: object.type
            }});
        }
    }
    else {
        if (target.type != 'creep' && target.type != 'powerCreep') {
            bulk.update(target, {hits: target.hits});
        }
    }
    if(object.actionLog && object.type == 'creep') {
        if(attackType == C.EVENT_ATTACK_TYPE_MELEE || attackType == C.EVENT_ATTACK_TYPE_DISMANTLE) {
            object.actionLog.attack = {
                x: target.x,
                y: target.y
            };
        }
        if(attackType == C.EVENT_ATTACK_TYPE_RANGED) {
            object.actionLog.rangedAttack = {
                x: target.x,
                y: target.y
            };
        }
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
        eventLog.push({event: C.EVENT_ATTACK, objectId: target._id, data: {targetId: object._id,
            damage: attackBackPower, attackType: C.EVENT_ATTACK_TYPE_HIT_BACK}})
    }

    eventLog.push({event: C.EVENT_ATTACK, objectId: object._id, data: {targetId: target._id, damage, attackType}});
};

