var _ = require('lodash');

module.exports = function(objectIntents, roomObjects, roomTerrain, bulk, bulkUsers, roomController, flags, flagsBulk) {

    flags.forEach(i => {
        i._parsed = i.data.split("|");
        i._parsed = _.map(i._parsed, j => j.split("~"));
    });

    if(objectIntents.removeFlag) {
        _.forEach(objectIntents.removeFlag, (i) => {
            require('./remove-flag')(i, flags);
        });
    }
    if(objectIntents.createFlag) {
        _.forEach(objectIntents.createFlag, (i) => {
            require('./create-flag')(i, flags);
        });
    }
    if(objectIntents.createConstructionSite) {
        _.forEach(objectIntents.createConstructionSite, (i) => {
            require('./create-construction-site')(i, roomObjects, roomTerrain, bulk, bulkUsers, roomController);
        });
    }
    if(objectIntents.destroyStructure) {
        _.forEach(objectIntents.destroyStructure, (i) => {
            require('./destroy-structure')(i, roomObjects, roomTerrain, bulk, bulkUsers, roomController);
        });
    }

    if(objectIntents.genEnergy) {
        require('./gen-energy')(objectIntents.genEnergy, roomObjects, roomTerrain, bulk, bulkUsers, roomController);
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