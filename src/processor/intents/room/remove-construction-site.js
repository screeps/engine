var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(intent, userId, roomObjects, roomTerrain, bulk, bulkUsers, roomController) {

    var object = roomObjects[intent.id];

    if(!object || object.type != 'constructionSite') return;

    if(object.user != userId && !(roomController && roomController.user == userId)) return;

    bulk.remove(object._id);
    if(object.progress > 1) {
        require('../creeps/_create-energy')(object.x, object.y, object.room, Math.floor(object.progress/2), roomObjects, bulk);
    }
};