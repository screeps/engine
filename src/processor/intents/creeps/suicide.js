var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, scope) {

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning) {
        return;
    }

    require('./_die')(object, object.user == '2' ? 0 : undefined, scope);
};