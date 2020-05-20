const _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, scope) {
    // prevent double drop
    if(_.some(scope.roomObjects, o => (o.type == C.STRUCTURE_WARP_CONTAINER) && (o != object))) {
        object.store = {};
    }
};
