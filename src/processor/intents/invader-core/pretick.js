const _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    stronghold = require('./stronghold/stronghold');

module.exports = function(object, scope) {
    const {roomObjects, roomController} = scope;
    const user = object.user;
    const intents = {
        list: {},
        set(id, name, data) {
            this.list[id] = this.list[id] || {};
            this.list[id][name] = data;
        }
    };

    if(!object.hits || (object.hits < object.hitsMax)) {
        return;
    }

    const behavior = object.strongholdBehavior || 'default';
    if(!stronghold.behaviors[behavior]) {
        return;
    }

    const creeps = [], defenders = [], hostiles = [], towers = [], ramparts = [];
    _.forEach(roomObjects, o => {
        if(o.type == 'creep') {
            creeps.push(o);
            if(o.user == user) {
                defenders.push(o);
            } else if(o.user != '3') {
                hostiles.push(o);
            }
            return;
        }
        if(o.type == C.STRUCTURE_TOWER && o.user == user) {
            towers.push(o);
            return;
        }
        if(o.type == C.STRUCTURE_RAMPART && o.user == user) {
            ramparts.push(o);
        }
    });

    const context = {intents, creeps, defenders, hostiles, towers, ramparts, roomController, core: object};

    stronghold.behaviors[behavior](context);

    return intents.list;
};
