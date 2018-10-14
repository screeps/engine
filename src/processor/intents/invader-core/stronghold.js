var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = {

    tower: {
        attack: function(object, target, scope) {
            const {intents} = scope;

            intents.set(this.id, 'attack', {id: target.id});
        }
    }
};
