var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {
    const {roomObjects, roomTerrain, gameTime, bulk, eventLog, roomController} = scope;

    if(roomController) {
        if(!roomController.isPowerEnabled) {
            return;
        }
        if(roomController.user != object.user && roomController.safeMode > gameTime) {
            return;
        }
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

    var ops = powerInfo.ops || 0;
    if(_.isArray(ops)) {
        ops = ops[creepPower.level-1];
    }

    if((object.ops || 0) < ops) {
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
        if(currentEffect && currentEffect.level > creepPower.level && currentEffect.endTime > gameTime) {
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
            if(target.type != 'storage' && target.type != 'terminal' && target.type !== 'container') {
                return;
            }
            var effect = _.find(target.effects, {power: C.PWR_DISRUPT_TERMINAL});
            if(effect && effect.endTime > gameTime) {
                return;
            }
            var extensions = _.filter(roomObjects, i => i.type == 'extension' && i.user == target.user && !i.off);
            var energyLimit = powerInfo.effect[creepPower.level-1] * _.sum(extensions, 'energyCapacity');
            extensions.sort(utils.comparatorDistance(target));
            extensions.every((extension) => {
                var energy = Math.min(energyLimit, target.energy, extension.energyCapacity - extension.energy);
                bulk.update(extension, {energy: extension.energy + energy});
                bulk.update(target, {energy: target.energy - energy});
                energyLimit -= energy;
                return energyLimit > 0 && target.energy > 0;
            });
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
            applyEffectOnTarget = true;
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

        case C.PWR_REGEN_SOURCE: {
            if(target.type != 'source') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_REGEN_MINERAL: {
            if(target.type != 'mineral') {
                return;
            }
            if(target.mineralAmount == 0) {
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

        case C.PWR_OPERATE_CONTROLLER: {
            if(target.type != 'controller') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_OPERATE_POWER: {
            if(target.type != 'powerSpawn') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_FORTIFY: {
            if(target.type != 'rampart' && target.type != 'constructedWall') {
                return;
            }
            applyEffectOnTarget = true;
            break;
        }

        case C.PWR_SHIELD: {
            var constructionSite = _.find(roomObjects, i => i.x == object.x && i.y == object.y &&
                i.type == 'constructionSite');
            if(constructionSite) {
                bulk.remove(constructionSite._id);
                delete roomObjects[constructionSite._id];
            }
            if(!utils.checkConstructionSite(roomObjects, 'rampart', object.x, object.y) ||
                !utils.checkConstructionSite(roomTerrain, 'rampart', object.x, object.y)) {
                return;
            }
            bulk.insert({
                type: 'rampart',
                room: object.room,
                x: object.x,
                y: object.y,
                user: object.user,
                hits: powerInfo.effect[creepPower.level-1],
                hitsMax: 0,
                nextDecayTime: gameTime + powerInfo.duration,
                effects: [
                    {
                        power: C.PWR_SHIELD,
                        level: creepPower.level,
                        endTime: gameTime + powerInfo.duration
                    }
                ]
            });
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
        ops: (object.ops || 0) - ops
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
