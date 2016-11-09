var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, roomObjects, bulk) {

    if(!object || object.type != 'constructionSite') return;

    bulk.remove(object._id);
    if(object.progress > 1) {
        require('../creeps/_create-energy')(object.x, object.y, object.room, Math.floor(object.progress/2), roomObjects, bulk);
    }

};