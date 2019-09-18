const _ = require('lodash'),
    utils = require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    strongholds = driver.strongholds,
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

const deployStronghold = function deployStronghold(context) {
    const { scope, core, ramparts, bulk, gameTime } = context;
    const { roomObjects } = scope;

    if(core.deployTime && (core.deployTime <= gameTime)) {
        const decayTime = gameTime + C.STRONGHOLD_DECAY_TICKS;

        bulk.update(core, {
            deployTime: null,
            decayTime,
            hits: C.INVADER_CORE_HITS,
            hitsMax: C.INVADER_CORE_HITS
        });

        _.forEach(ramparts, rampart => {bulk.remove(rampart._id); delete roomObjects[rampart._id]});

        const template = strongholds.templates[core.templateName];

        const objectOptions = {};
        objectOptions[C.STRUCTURE_RAMPART] = {
            hits: C.STRONGHOLD_RAMPART_HITS[template.rewardLevel],
            hitsMax: C.STRONGHOLD_RAMPART_HITS[template.rewardLevel],
            nextDecayTime: decayTime
        };
        objectOptions[C.STRUCTURE_TOWER] = {
            hits: C.TOWER_HITS,
            hitsMax: C.TOWER_HITS,
            store:{ energy: C.TOWER_CAPACITY },
            storeCapacityResource: { energy: C.TOWER_CAPACITY },
            actionLog: {attack: null, heal: null, repair: null}
        };
        objectOptions[C.STRUCTURE_CONTAINER] = {
            notifyWhenAttacked: false,
            hits: C.CONTAINER_HITS,
            hitsMax: C.CONTAINER_HITS,
            nextDecayTime: decayTime,
            store: { energy: 0 },
            storeCapacity: 0
        };
        objectOptions[C.STRUCTURE_ROAD] = {
            notifyWhenAttacked: false,
            hits: C.ROAD_HITS,
            hitsMax: C.ROAD_HITS,
            nextDecayTime: decayTime
        };

        const structures = _.map(template.structures, i => {
                const s = _.merge(i, { x: 0+core.x+i.dx, y: 0+core.y+i.dy, room: core.room, user: core.user, strongholdId: core.strongholdId, decayTime }, objectOptions[i.type]||{});
                delete s.dx;
                delete s.dy;
                return s;
            });

        _.forEach(structures, s => { if(s.type != C.STRUCTURE_INVADER_CORE) bulk.insert(s) });
    }
};

const reserveController = function reserveController (context) {
    const { core, intents, roomController } = context;

    if(roomController) {
        intents.set(core._id, 'reserveController', {id: roomController._id});
    }
};

const refillTowers = function refillTowers(context) {
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

const refillCreeps = function refillCreeps(context) {
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

const focusClosest = function focusClosest(context) {
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

const maintainCreep = function maintainCreep(name, setup, context, behavior) {
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

const antinuke = function antinuke(context) {
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
        'deploy': function(context) {
            reserveController(context);
            deployStronghold(context);
        },
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

            focusClosest(context);
        }
    }
};
