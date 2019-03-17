'use strict';

var _ = require('lodash'),
    utils = require('../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function (ownedObjects, { roomController, bulk }) {

    for (let type in ownedObjects) {
        var objects = ownedObjects[type];

        if (objects.length > C.CONTROLLER_STRUCTURES[type][roomController.level | 0]) {
            objects.sort(utils.comparatorDistance(roomController));
            objects = _.take(objects, C.CONTROLLER_STRUCTURES[type][roomController.level | 0]);
            ownedObjects[type].forEach(i => i._off = i.user != roomController.user || !_.contains(objects, i));
        } else {
            ownedObjects[type].forEach(i => i._off = false);
        }

        ownedObjects[type].forEach(i => {
            if (i._off !== i.off) {
                bulk.update(i._id, { off: i._off });
            }
        });
    }
};
//# sourceMappingURL=../../sourcemaps/processor/intents/_check_active_structures.js.map
