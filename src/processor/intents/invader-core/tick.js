var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, scope) {
    if(!object || object.type != 'invaderCore') return;

    const {roomObjects, bulk, gameTime} = scope;

    if(object.nextDecayTime && gameTime >= object.nextDecayTime) {
        const existingStructures = _.filter(roomObjects, {strongholdId: object.strongholdId});
        existingStructures.forEach(s => {bulk.remove(s._id); delete roomObjects[s._id]});
        return;
    }

    if(object.spawning) {
        object.spawning.remainingTime--;

        if(object.spawning.remainingTime <= 0) {

            var spawningCreep = _.find(roomObjects, {type: 'creep', name: object.spawning.name, x: object.x, y: object.y});

            var bornOk = require('../spawns/_born-creep')(object, spawningCreep, scope);

            if(bornOk) {
                bulk.update(object, {spawning: null});
            }
            else {
                bulk.update(object, {spawning: {remainingTime: 0}});
            }
        }
        else {
            bulk.update(object, {spawning: {remainingTime: object.spawning.remainingTime}});
        }
    }

    if(!_.isEqual(object.actionLog, object._actionLog)) {
        bulk.update(object, {actionLog: object.actionLog});
    }
};
