var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

module.exports = function(object, {bulk}) {

    if(object.cooldown > 0) {

        object.cooldown--;

        if(object.cooldown < 0)
            object.cooldown = 0;

        bulk.update(object, {
            cooldown: object.cooldown,
            actionLog: object.actionLog
        });
    }
    else {
        if(!_.isEqual(object._actionLog, object.actionLog)) {
            bulk.update(object, {
                actionLog: object.actionLog
            });
        }
    }

};