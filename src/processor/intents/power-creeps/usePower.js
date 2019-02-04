var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {
    const {roomObjects, gameTime, bulk, eventLog, roomController} = scope;

    if(!roomController || !roomController.isPowerEnabled) {
        return;
    }

    const powerInfo = C.POWER_INFO[intent.power];
    if(!powerInfo) {
        return;
    }
    const creepPower = object.powers[intent.power];
    let target;

    if(!creepPower || creepPower.level == 0 || creepPower.cooldownTime > gameTime) {
        return;
    }

    if(powerInfo.ops && (object.ops || 0) < powerInfo.ops) {
        return;
    }

    if(powerInfo.range) {
        target = roomObjects[intent.id];
        if(!target) {
            return;
        }
        if(utils.dist(object, target) > powerInfo.range) {
            return;
        }
        var currentEffect = _.find(target.effects, i => i.power == intent.power);
        if(currentEffect && currentEffect.level >= creepPower.level && currentEffect.endTime > gameTime) {
            return;
        }
    }

    var applyEffectOnTarget = false;

    switch(intent.power) {

        case C.PWR_GENERATE_OPS: {
            bulk.update(object, {
                [C.RESOURCE_OPS]: (object[C.RESOURCE_OPS] || 0) + powerInfo.effect[creepPower.level-1],
            });
            let sum = utils.calcResources(object);

            if (sum > object.energyCapacity) {
                require('./drop')(object, {
                    amount: Math.min(object[C.RESOURCE_OPS], sum - object.energyCapacity),
                    resourceType: C.RESOURCE_OPS
                }, scope);
            }
            break;
        }

        case C.PWR_OPERATE_SPAWN: {
            if(target.type != 'spawn') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_OPERATE_TOWER: {
            if(target.type != 'tower') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_OPERATE_STORAGE: {
            if(target.type != 'storage') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_OPERATE_LAB: {
            if(target.type != 'lab') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_OPERATE_EXTENSION: {
            break;
        }

        case C.PWR_OPERATE_OBSERVER: {
            if(target.type != 'observer') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_OPERATE_TERMINAL: {
            if(target.type != 'terminal') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_DISRUPT_SPAWN: {
            if(target.type != 'spawn') {
                return;
            }
            if(!target.spawning) {
                return;
            }
            bulk.update(target, {
                spawning: {
                    remainingTime: target.spawning.remainingTime + powerInfo.effect[creepPower.level-1]
                }
            });
            break;
        }

        case C.PWR_DISRUPT_TOWER: {
            if(target.type != 'tower') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_DISRUPT_SOURCE: {
            if(target.type != 'source') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_REGENERATE_SOURCE: {
            if(target.type != 'source') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_REGENERATE_MINERAL: {
            if(target.type != 'mineral') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_DISRUPT_TERMINAL: {
            if(target.type != 'terminal') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }
    }

    if(applyEffectOnTarget) {
        var effects = Object.values(target.effects || []);
        _.remove(effects, {power: intent.power});
        effects.push({
            power: intent.power,
            level: creepPower.level,
            endTime: gameTime +
                (_.isArray(powerInfo.duration) ? powerInfo.duration[creepPower.level-1] : powerInfo.duration)
        });
        bulk.update(target, {effects: null});
        bulk.update(target, {effects});
    }

    bulk.update(object, {
        powers: {
            [intent.power]: {
                cooldownTime: gameTime + powerInfo.cooldown
            }
        },
        ops: (object.ops || 0) - (powerInfo.ops || 0)
    });

    eventLog.push({event: C.EVENT_POWER, objectId: object._id, data: {
        power: intent.power,
        targetId: intent.id
    }});

    object.actionLog.power = {
        id: intent.power,
        x: target ? target.x : object.x,
        y: target ? target.y : object.y,
    };
};
