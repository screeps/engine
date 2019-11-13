const _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    stronghold = require('./stronghold/stronghold');

module.exports = function(object, scope) {
    const {gameTime, roomObjects, roomController, bulk} = scope;
    const user = object.user;
    const intents = {
        list: {},
        set(id, name, data) {
            this.list[id] = this.list[id] || {};
            this.list[id][name] = data;
        }
    };

    const behavior = object.deployTime ? 'deploy' : object.strongholdBehavior || 'default';
    if(!stronghold.behaviors[behavior]) {
        return;
    }

    const creeps = [],
        defenders = [], damagedDefenders=[],
        hostiles = [],
        towers = [],
        ramparts = [],
        damagedRoads = [];
    _.forEach(roomObjects, o => {
        if((o.type == 'creep' || o.type == 'powerCreep') && !o.spawning) {
            creeps.push(o);
            if(o.user == user) {
                defenders.push(o);
                if(o.hits < o.hitsMax) {
                    damagedDefenders.push(o);
                }
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
            return;
        }
        if(object.strongholdId == o.strongholdId && o.type == C.STRUCTURE_ROAD && o.hits < o.hitsMax) {
            damagedRoads.push(o);
        }
    });

    const context = {scope, intents, roomObjects, gameTime, bulk, creeps, defenders, damagedDefenders, hostiles, towers, ramparts, damagedRoads, roomController, core: object};

    stronghold.behaviors[behavior](context);

    return intents.list;
};
