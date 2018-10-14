var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, scope) {
    const {roomObjects} = scope;
    const user = object.user;

    if(!object.hits || (object.hits < object.hitsMax)) {
        return;
    }

    const intents = {
        list: {},
        set(id, name, data) {
            this.list[id] = this.list[id] || {};
            this.list[id][name] = data;
        }
    };

    const creeps = _.filter(roomObjects, {type: 'creep'});
    const hostiles = _.filter(creeps, c => c.user != user);
    const towers = _.filter(roomObjects, {type: C.STRUCTURE_TOWER, user: user});
    const underchargedTowers = _.filter(towers, t => 2*t.energy <= t.energyCapacity);
    if(_.some(underchargedTowers)) {
        const towerToCharge = _.first(underchargedTowers.sort((a,b)=>a.energy-b.energy));
        if(towerToCharge) {
            intents.set(object._id, 'transfer', {id: towerToCharge._id, amount: Math.floor(towerToCharge.energyCapacity/2), resourceType: C.RESOURCE_ENERGY});
        }
    }

    if(_.some(hostiles)) {
        const target = _.first(hostiles.sort(utils.comparatorDistance(object)));
        if(target) {
            for(let t of towers) {
                intents.set(t._id, 'attack', {id: target._id});
            }
        }
    }

    return intents.list;
};
