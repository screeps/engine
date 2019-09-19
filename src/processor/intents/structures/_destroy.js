const _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, scope) {
    const {gameTime, bulk, roomObjects} = scope;

    if(object.type == 'spawn' && object.spawning) {
        const spawning = _.find(roomObjects, {user: object.user, name: object.spawning.name});
        if(spawning) {
            bulk.remove(spawning._id);
            delete roomObjects[spawning._id];
        }
    }

    if(object.type == 'invaderCore') {
        require('../invader-core/destroy')(object, scope);
    }

    const ruin = {
        type: 'ruin',
        room: object.room,
        x: object.x,
        y: object.y,
        structureType: object.type,
        destroyTime: gameTime,
        decayTime: gameTime + C.RUIN_DECAY
    };
    if(object.user) {
        ruin.user = object.user
    }
    if(object.store) {
        ruin.store = object.store;
    }

    if(object.effects) {
        const keepEffects = _.filter(object.effects, {effect: C.EFFECT_COLLAPSE_TIMER});
        if(_.some(keepEffects)) {
            ruin.effects = keepEffects;
            ruin.decayTime = _.max([ruin.decayTime, _.map(keepEffects, 'endTime')]);
        }
    }

    bulk.insert(ruin);
    bulk.remove(object._id);
    delete roomObjects[object._id];
};
