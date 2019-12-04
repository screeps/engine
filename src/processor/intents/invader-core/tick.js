var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, scope) {
    if(!object || object.type != 'invaderCore') return;

    const {roomObjects, roomController, bulk, roomInfo, gameTime} = scope;

    const collapseEffect = _.find(object.effects, {effect: C.EFFECT_COLLAPSE_TIMER});
    if(collapseEffect && collapseEffect.endTime <= gameTime) {
        if(roomController) {
            bulk.update(roomController, {
                user: null,
                level: 0,
                progress: 0,
                downgradeTime: null,
                safeMode: null,
                safeModeAvailable: 0,
                safeModeCooldown: null,
                isPowerEnabled: false,
                effects: null
            });
        }
        return;
    }

    if(object.spawning) {
        if(gameTime >= object.spawning.spawnTime-1) {
            const spawningCreep = _.find(roomObjects, {type: 'creep', name: object.spawning.name, x: object.x, y: object.y});
            const bornOk = require('../spawns/_born-creep')(object, spawningCreep, scope);

            if(bornOk) {
                bulk.update(object, {spawning: null});
            }
            else {
                bulk.update(object, {spawning: {spawnTime: 1+gameTime}});
            }
        }
    }

    if(!_.isEqual(object.actionLog, object._actionLog)) {
        roomInfo.active = true;
        bulk.update(object, {actionLog: object.actionLog});
    }
};
