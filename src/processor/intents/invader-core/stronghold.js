var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

const range = function(a, b) {
    if(
        _.isUndefined(a) || _.isUndefined(a.x) || _.isUndefined(a.y) || _.isUndefined(a.room) ||
        _.isUndefined(b) || _.isUndefined(b.x) || _.isUndefined(b.y) || _.isUndefined(b.room) ||
        a.room != b.room) {
        return Infinity;
    }

    return Math.max(Math.abs(a.x-b.x), Math.abs(a.y-b.y));
};

const reserveController = function(context) {
    const { core, intents, roomController } = context;

    if(roomController) {
        intents.set(core._id, 'reserveController', {id: roomController._id});
    }
};

const refillTowers = function(context) {
    const {core, intents, towers} = context;
    const underchargedTowers = _.filter(towers, t => 2*t.energy <= t.energyCapacity);
    if(_.some(underchargedTowers)) {
        const towerToCharge = _.first(underchargedTowers.sort((a,b)=>a.energy-b.energy));
        if(towerToCharge) {
            intents.set(core._id, 'transfer', {id: towerToCharge._id, amount: Math.floor(towerToCharge.energyCapacity/2), resourceType: C.RESOURCE_ENERGY});
            return true;
        }
    }

    return false;
};

const focusClosest = function(context) {
    const {core, intents, defenders, hostiles, towers} = context;

    if(!_.some(hostiles)) {
        return false;
    }

    const target = _.first(hostiles.sort(utils.comparatorDistance(core)));
    if(!target) {
        return false;
    }
    for(let t of towers) {
        intents.set(t._id, 'attack', {id: target._id});
    }

    const meleesNear = _.filter(defenders, d => (range(d, target) == 1) && _.some(d.body, {type: C.ATTACK}));
    for(let melee of meleesNear) {
        intents.set(melee._id, 'attack', {id: target._id, x: target.x, y: target.y});
    }

    const rangersInRange = _.filter(defenders, d => (range(d, target) <= 3) && _.some(d.body, {type: C.RANGED_ATTACK}));
    for(let r of rangersInRange) {
        if(range(r,target) == 1) {
            intents.set(r._id, 'rangedMassAttack', {});
        } else {
            intents.set(r._id, 'rangedAttack', {id: target._id});
        }
    }

    return true;
};

module.exports = {
    behaviors: {
        'default': function(context){
            reserveController(context);
            refillTowers(context);
            focusClosest(context);
        }
    }
};
