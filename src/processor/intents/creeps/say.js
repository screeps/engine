var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, {}) {

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning) {
        return;
    }
    if(!_.isString(intent.message)) {
        return;
    }

    object.actionLog.say = {
        message: intent.message.substring(0,10),
        isPublic: intent.isPublic
    };
};