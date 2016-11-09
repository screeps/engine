var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../movement');

module.exports = function(object, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats) {

    if(!object || object.type != 'tower') return;

    if(!_.isEqual(object._actionLog, object.actionLog)) {
        bulk.update(object, {
            actionLog: object.actionLog
        });
    }

};