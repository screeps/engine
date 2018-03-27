var _ = require('lodash');

module.exports = function(userId, objectIntents, roomObjects, roomTerrain, bulk, bulkUsers, roomController, flags, flagsBulk) {

    flags.forEach(i => {
        i._parsed = i.data.split("|");
        i._parsed = _.map(i._parsed, j => j.split("~"));
    });

    if(objectIntents.removeFlag) {
        _.forEach(objectIntents.removeFlag, (i) => {
            require('./remove-flag')(i, flags, userId);
        });
    }
    if(objectIntents.createFlag) {
        _.forEach(objectIntents.createFlag, (i) => {
            require('./create-flag')(i, flags, userId);
        });
    }
    if(objectIntents.createConstructionSite) {
        _.forEach(objectIntents.createConstructionSite, (i) => {
            require('./create-construction-site')(i, userId, roomObjects, roomTerrain, bulk, bulkUsers, roomController);
        });
    }
    if(objectIntents.removeConstructionSite) {
        _.forEach(objectIntents.removeConstructionSite, (i) => {
            require('./remove-construction-site')(i, userId, roomObjects, roomTerrain, bulk, bulkUsers, roomController);
        });
    }
    if(objectIntents.destroyStructure) {
        _.forEach(objectIntents.destroyStructure, (i) => {
            require('./destroy-structure')(i, userId, roomObjects, roomTerrain, bulk, bulkUsers, roomController);
        });
    }

    if(objectIntents.genEnergy) {
        require('./gen-energy')(objectIntents.genEnergy, userId, roomObjects, roomTerrain, bulk, bulkUsers, roomController);
    }

    flags.forEach(i => {
        if(i._modified) {
            var data = _.map(i._parsed, j => j.join("~")).join("|");

            if(i._id) {
                flagsBulk.update(i._id, {data});
            }
            else {
                flagsBulk.insert({data, user: i.user, room: i.room});
            }
        }
    });
};