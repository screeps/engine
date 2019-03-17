var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

module.exports = function(object, intent, scope) {

    require('../creeps/move')(object, intent, scope);
};
