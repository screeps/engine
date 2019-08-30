const _ = require('lodash'),
    utils = require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    creeps = require('./creeps'),
    fortifier = require('./fortifier'),
    simpleMelee = require('./simple-melee');

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
    const underchargedTowers = _.filter(towers, t => 2*t.store.energy <= t.storeCapacityResource.energy);
    if(_.some(underchargedTowers)) {
        const towerToCharge = _.min(underchargedTowers, 'store.energy');
        if(towerToCharge) {
            intents.set(core._id, 'transfer', {id: towerToCharge._id, amount: towerToCharge.storeCapacityResource.energy - towerToCharge.store.energy, resourceType: C.RESOURCE_ENERGY});
            return true;
        }
    }

    return false;
};

const refillCreeps = function(context) {
    const {core, intents, defenders} = context;

    const underchargedCreeps = _.filter(defenders, c => (c.storeCapacity > 0) && (2*c.store.energy <= c.storeCapacity));
    if(_.some(underchargedCreeps)) {
        const creep = _.min(underchargedCreeps, 'store.energy');
        if(creep) {
            intents.set(core._id, 'transfer', {id: creep._id, amount: creep.storeCapacity - creep.store.energy, resourceType: C.RESOURCE_ENERGY});
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

    const target = _.min(hostiles, c => utils.dist(c, core));
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

const maintainCreep = function(name, setup, context, behavior) {
    const {core, intents, defenders} = context;
    const creep = _.find(defenders, {name});
    if(creep && behavior) {
        behavior(creep, context);
        return;
    }

    intents.set(core._id, 'createCreep', {
        name,
        body: setup.body,
        boosts: setup.boosts
    })
};

const antinuke = function(context) {
    const { core, ramparts, roomObjects, bulk, gameTime } = context;
    if(!!(gameTime % 10)) {
        return;
    }
    const nukes = _.filter(roomObjects, {type: 'nuke'});
    if(!_.some(nukes)) {
        return;
    }

    const baseLevel = C.STRONGHOLD_RAMPART_HITS[core.level];
    for(let rampart of ramparts) {
        let hitsMax = baseLevel;
        _.forEach(nukes, n => {
            const range = utils.dist(rampart, n);
            if(range == 0) {
                hitsMax += C.NUKE_DAMAGE[0];
                return;
            }
            if(range <= 2) {
                hitsMax += C.NUKE_DAMAGE[2];
            }
        });
        if(rampart.hitsMax != hitsMax) {
            bulk.update(rampart, {hitsMax});
        }
    }
};

module.exports = {
    behaviors: {
        'default': function(context){
            reserveController(context);
            refillTowers(context);
            focusClosest(context);
        },
        'bunker5': function(context) {
            reserveController(context);
            refillTowers(context) || refillCreeps(context);

            antinuke(context);
            maintainCreep('fortifier', creeps['fortifier'], context, fortifier);
            maintainCreep('defender1', creeps['weakDefender'], context, simpleMelee);
        }
    }
};
