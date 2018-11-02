const _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intents, scope) {
    const {gameTime} = scope;
    if(object.landTime == 1 + gameTime) {
        _.forEach(intents.users, userIntents => {
            _.forEach(userIntents.objects, i => {
                if(!!i.createCreep) { i.createCreep = null; }
            });
        });
    }
};
