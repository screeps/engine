var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function({roomObjects, bulk}) {

    _.forEach(roomObjects, (i) => {
        if(i.type == 'constructedWall' && i.decayTime && i.user) {
            bulk.remove(i._id);
            delete roomObjects[i._id];
        }
    });
};