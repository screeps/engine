const _ = require('lodash'),
    utils =  require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    fakeRuntime = require('../../../common/fake-runtime');

module.exports = function(creep, scope) {
    const {roomObjects} = scope;

    const intents = {
        list: {},
        set(id, name, data) {
            this.list[id] = this.list[id] || {};
            this.list[id][name] = data;
        }
    };

    const creeps = [], invaders = [], healers = [], hostiles = [], defenders = [], fortifications = [];
    _.forEach(roomObjects, function(object){
        if(object.type == 'creep' || object.type == 'powerCreep') {
            creeps.push(object);
            if(creep.user == object.user) {
                invaders.push(object);
                if(fakeRuntime.hasActiveBodyparts(object, C.HEAL)) {
                    healers.push(object);
                }
            } else {
                if(object.user != 3) {
                    hostiles.push(object);
                    if(_.some(object.body, i => (i.hits > 0) && (i.type == C.ATTACK) || (i.type == C.RANGED_ATTACK))) {
                        defenders.push(object);
                    }
                }
            }
        }
        if(object.type==C.STRUCTURE_RAMPART || object.type==C.STRUCTURE_WALL) {
            fortifications.push(object);
        }
    });

    const context = {scope, intents, roomObjects, creeps, invaders, healers, hostiles, defenders, fortifications};

    if(_.some(creep.body, {type: C.HEAL})) {
        require('./healer')(creep, context);
    } else {
        require('./findAttack')(creep, context);
    }

    require('./shootAtWill')(creep, context);

    return intents.list;
};
