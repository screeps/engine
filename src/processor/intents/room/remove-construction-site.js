var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(userId, intent, scope) {

    const {roomObjects, bulk, roomController} = scope;

    var object = roomObjects[intent.id];

    if(!object || object.type != 'constructionSite') return;

    if(object.user != userId && !(roomController && roomController.user == userId)) return;

    bulk.remove(object._id);
    if(object.progress > 1) {
        require('../_create-energy')(object.x, object.y, object.room, Math.floor(object.progress/2), 'energy', scope);
    }
};
