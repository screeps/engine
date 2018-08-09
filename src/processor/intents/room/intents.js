var _ = require('lodash');

module.exports = function(userId, objectIntents, scope) {

    const {flags, bulkFlags} = scope;

    flags.forEach(i => {
        i._parsed = i.data.split("|");
        i._parsed = _.map(i._parsed, j => j.split("~"));
    });

    if(objectIntents.removeFlag) {
        _.forEach(objectIntents.removeFlag, (i) => {
            require('./remove-flag')(userId, i, scope);
        });
    }
    if(objectIntents.createFlag) {
        _.forEach(objectIntents.createFlag, (i) => {
            require('./create-flag')(userId, i, scope);
        });
    }
    if(objectIntents.createConstructionSite) {
        _.forEach(objectIntents.createConstructionSite, (i) => {
            require('./create-construction-site')(userId, i, scope);
        });
    }
    if(objectIntents.removeConstructionSite) {
        _.forEach(objectIntents.removeConstructionSite, (i) => {
            require('./remove-construction-site')(userId, i, scope);
        });
    }
    if(objectIntents.destroyStructure) {
        _.forEach(objectIntents.destroyStructure, (i) => {
            require('./destroy-structure')(userId, i, scope);
        });
    }

    if(objectIntents.genEnergy) {
        require('./gen-energy')(userId, objectIntents.genEnergy, scope);
    }

    flags.forEach(i => {
        if(i._modified) {
            var data = _.map(i._parsed, j => j.join("~")).join("|");

            if(i._id) {
                bulkFlags.update(i._id, {data});
            }
            else {
                bulkFlags.insert({data, user: i.user, room: i.room});
            }
        }
    });
};