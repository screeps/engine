var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    stronghold = require('./stronghold');

const upgradeCore = function(object, newLevel, scope) {
    const {roomObjects, bulk, gameTime, roomTerrain} = scope;
    
    object.level = newLevel;
    const existingCoreDamage = object.hitsMax ? Math.max(0, object.hitsMax - object.hits) : 0;
    object.hitsMax = C.INVADER_CORE_HITS[object.level];
    object.hits = object.hitsMax - existingCoreDamage;
    
    if(C.INVADER_CORE_UPGRADE[object.level] && stronghold.levelAvailable(object.x, object.y, 1+object.level, roomTerrain)) {
        object.nextUpgradeTime = gameTime + C.INVADER_CORE_UPGRADE[object.level];
        object.nextDecayTime = null;
    } else {
        object.nextUpgradeTime = null;
        object.nextDecayTime = gameTime + C.STRONGHOLD_DECAY_TICKS;
    }

    bulk.update(object, {
        level: object.level,
        nextUpgradeTime: object.nextUpgradeTime,
        nextDecayTime: object.nextDecayTime,
        hits: object.hits,
        hitsMax: object.hitsMax
    });

    const decayTime = 1 + (object.nextUpgradeTime || object.nextDecayTime);

    const existingStructures = _.filter(roomObjects, {coreId: object._id});
    existingStructures.forEach(function(s) {
        if(s.nextDecayTime) {
            s.nextDecayTime = decayTime;
            bulk.update(s, {
                nextDecayTime: s.nextDecayTime
            });
        }
        if(s.type === C.STRUCTURE_RAMPART) {
            const existingDamage = Math.max(s.hitsMax - s.hits);
            s.hitsMax = C.INVADER_CORE_RAMPART_HITS[object.level];
            s.hits = s.hitsMax - existingDamage;
            bulk.update(s, {
                hits: s.hits,
                hitsMax: s.hitsMax
            });
        }
    });

    const newStructures = stronghold.createStructures(object.x, object.y, object.room, object.level, "2", decayTime);
    if(newStructures) {
        newStructures.forEach(function(s) {
            s.coreId = object._id;
            bulk.insert(s);
        });
    }
};

module.exports = function(object, scope) {
    if(!object || object.type != 'invaderCore') return;
    
    const {roomObjects, bulk, gameTime} = scope;

    if(!object.level && !object.nextUpgradeTime && !object.nextDecayTime) {
        upgradeCore(object, 0, scope);
        return;
    }

    if(object.nextDecayTime && gameTime >= object.nextDecayTime) {
        const existingStructures = _.filter(roomObjects, {coreId: object._id});
        existingStructures.forEach(s => bulk.remove(s._id));
        bulk.remove(object._id);
        delete roomObjects[object._id];
        return;
    }

    if(object.nextUpgradeTime && gameTime >= object.nextUpgradeTime) {
        upgradeCore(object, 1+object.level, scope);
    }
};