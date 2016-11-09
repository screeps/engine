var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, intent, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats) {

    if(object.type != 'creep') {
        return;
    }
    if(object.spawning) {
        return;
    }

    require('./_die')(object, roomObjects, bulk, undefined, object.user == '2' ? 0 : undefined);

};