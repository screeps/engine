var q = require('q'),
    _ = require('lodash'),
    utils = require('../../utils'),
    driver = utils.getDriver(),
    path = require('path'),
    C = driver.constants;

const intentTypes = ['spawnPowerCreep','suicidePowerCreep','deletePowerCreep','upgradePowerCreep','createPowerCreep','renamePowerCreep'];

var modules = require('bulk-require')(path.resolve(__dirname, 'power'), ['*.js']);

module.exports = function(scope) {

    const {usersById, userIntents, roomObjectsByType, gameTime} = scope;

    if(userIntents) {
        userIntents.forEach(iUserIntents => {
            var user = usersById[iUserIntents.user];

            intentTypes.forEach(intentType => {
                if(iUserIntents.intents[intentType]) {
                    iUserIntents.intents[intentType].forEach(intent => {
                        modules[intentType](intent, user, scope);
                    })
                }
            });
        })
    }

    if(roomObjectsByType.powerCreep) {
        roomObjectsByType.powerCreep.forEach(creep => {
            if(gameTime >= creep.ageTime-1 || creep.hits <= 0) {
               require('./power/_diePowerCreep')(creep, scope);
            }
        })
    }
};