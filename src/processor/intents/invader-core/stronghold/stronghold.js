const _ = require('lodash'),
    utils = require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    strongholds = driver.strongholds,
    defence = require('./defence'),
    creeps = require('./creeps');

const towerRefillChance = [0,0.01,0.1,0.3,1,1];

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

    if(core.deployTime && (core.deployTime <= (1+gameTime))) {
        const duration = Math.round(C.STRONGHOLD_DECAY_TICKS * (0.9 + Math.random() * 0.2));
        const decayTime = gameTime + duration;

        core.effects.push({
            effect: C.EFFECT_COLLAPSE_TIMER,
            power: C.EFFECT_COLLAPSE_TIMER,
            endTime: gameTime + duration,
            duration
        });
        bulk.update(core, {
            deployTime: null,
            decayTime,
            hits: C.INVADER_CORE_HITS,
            hitsMax: C.INVADER_CORE_HITS,
            effects: core.effects
        });

        _.forEach(ramparts, rampart => {bulk.remove(rampart._id); delete roomObjects[rampart._id]});

        const template = strongholds.templates[core.templateName];
        const containerAmounts = [0, 500, 4000, 10000, 50000, 360000];

        const objectOptions = {};
        objectOptions[C.STRUCTURE_RAMPART] = {
            hits: C.STRONGHOLD_RAMPART_HITS[template.rewardLevel],
            hitsMax: C.RAMPART_HITS_MAX[8],
            hitsTarget: C.STRONGHOLD_RAMPART_HITS[core.level],
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
            store: {},
            storeCapacity: 0
        };
        objectOptions[C.STRUCTURE_ROAD] = {
            notifyWhenAttacked: false,
            hits: C.ROAD_HITS,
            hitsMax: C.ROAD_HITS,
            nextDecayTime: decayTime
        };

        let createdStructureCounter = 1;
        _.forEach(template.structures, i => {
            const x = 0+core.x+i.dx, y = 0+core.y+i.dy;
            _.forEach(roomObjects, o => {
                if(o.strongholdId || o.x != x || o.y != y) {
                    return;
                }

                if(o.type == 'creep' || o.type == 'powerCreep') {
                    require('../../creeps/_die')(o, undefined, true, scope);
                }
                if(o.type == 'constructionSite') {
                    delete roomObjects[o._id];
                    bulk.remove(o._id);
                    if(o.progress > 1) {
                        require('../../creeps/_create-energy')(o.x, o.y, o.room, Math.floor(o.progress/2), 'energy', scope);
                    }
                }
                if(C.CONSTRUCTION_COST[o.type]) {
                    require('../../structures/_destroy')(o, scope);
                }
            });

            if(i.type == C.STRUCTURE_INVADER_CORE) {
                return;
            }

            const s = Object.assign({}, i, {
                    x,
                    y,
                    room: core.room,
                    strongholdId: core.strongholdId,
                    decayTime,
                    effects: [{
                        effect: C.EFFECT_COLLAPSE_TIMER,
                        power: C.EFFECT_COLLAPSE_TIMER,
                        endTime: gameTime + duration,
                        duration
                    }]
                }, objectOptions[i.type]||{});
            delete s.dx;
            delete s.dy;

            if(i.type == C.STRUCTURE_TOWER || i.type == C.STRUCTURE_RAMPART) {
                s.user = core.user;
            }

            if(i.type == C.STRUCTURE_CONTAINER) {
                s.store = utils.calcReward(strongholds.containerRewards, containerAmounts[template.rewardLevel], 3);
            }

            bulk.insert(s);
            roomObjects['deployedStructure'+createdStructureCounter] = s;
            createdStructureCounter++;
        });
    }
};

const handleController = function reserveController (context) {
    const { gameTime, core, intents, roomController } = context;

    if(roomController) {
        if(roomController.user === core.user) {
            if(roomController.downgradeTime - gameTime < C.INVADER_CORE_CONTROLLER_DOWNGRADE - 25) {
                intents.set(core._id, 'upgradeController', {id: roomController._id});
            }
        } else if(!roomController.reservation || roomController.reservation.user === core.user) {
            intents.set(core._id, 'reserveController', {id: roomController._id});
        } else {
            intents.set(core._id, 'attackController', {id: roomController._id});
        }
    }
};

const refillTowers = function refillTowers(context) {
    const {core, intents, towers, ramparts} = context;
    if(towerRefillChance[core.level] < Math.random()) {
        return false;
    }

    const underchargedTowers = _.filter(towers, t => (t.store.energy <= 2*C.TOWER_ENERGY_COST) && _.some(ramparts, {x: t.x, y: t.y}));
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

const towersMaintenance = function towersMaintenance(context) {
    const {intents, towers, ramparts, damagedDefenders, damagedRoads} = context;
    if(!towers.length || (!damagedDefenders.length && !damagedRoads.length)) {
        return;
    }

    const protectedCreeps = _.filter(damagedDefenders, d => _.some(ramparts, {x: d.x, y: d.y}));
    if(_.some(protectedCreeps)) {
        const creep = _.first(protectedCreeps);
        const tower = _.first(towers);
        intents.set(tower._id, 'heal', {id: creep._id});
        _.pull(towers, tower);
        return;
    }

    const protectedRoads = _.filter(damagedRoads, r => _.some(ramparts, {x: r.x, y: r.y}));
    if(_.some(protectedRoads)) {
        const road = _.first(damagedRoads);
        const tower = _.first(towers);
        intents.set(tower._id, 'repair', {id: road._id});
        _.pull(towers, tower);
    }
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

const focusMax = function focusMax(context) {
    const {intents, defenders, hostiles, towers, gameTime} = context;

    if(!_.some(hostiles)) {
        return false;
    }

    const activeTowers = _.filter(towers, t => t.store.energy >= C.TOWER_ENERGY_COST);
    const target = _.max(hostiles, creep => {
        let damage = _.sum(activeTowers, tower => {
            let r = utils.dist(creep, tower);
            let amount = C.TOWER_POWER_ATTACK;
            if(r > C.TOWER_OPTIMAL_RANGE) {
                if(r > C.TOWER_FALLOFF_RANGE) {
                    r = C.TOWER_FALLOFF_RANGE;
                }
                amount -= amount * C.TOWER_FALLOFF * (r - C.TOWER_OPTIMAL_RANGE) / (C.TOWER_FALLOFF_RANGE - C.TOWER_OPTIMAL_RANGE);
            }
            [C.PWR_OPERATE_TOWER, C.PWR_DISRUPT_TOWER].forEach(power => {
                const effect = _.find(tower.effects, {power});
                if(effect && effect.endTime > gameTime) {
                    amount *= C.POWER_INFO[power].effect[effect.level-1];
                }
            });
            return Math.floor(amount);
        });
        damage += _.sum(defenders, defender => {
            let d = 0;
            if((range(defender, creep) <= 3) && _.some(defender.body, {type: C.RANGED_ATTACK})) {
                d += utils.calcBodyEffectiveness(defender.body, C.RANGED_ATTACK, 'rangedAttack', C.RANGED_ATTACK_POWER);
            }
            if((range(defender, creep) <= 1) && _.some(defender.body, {type: C.ATTACK})) {
                d += utils.calcBodyEffectiveness(defender.body, C.ATTACK, 'attack', C.ATTACK_POWER);
            }
            return d;
        });

        return damage;
    });

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

    for(let t of activeTowers) {
        intents.set(t._id, 'attack', {id: target._id});
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

    if(!core.spawning && !core._spawning) {
        intents.set(core._id, 'createCreep', {
            name,
            body: setup.body,
            boosts: setup.boosts
        });
        core._spawning = true;
    }
};

const maintainPopulation = function(context) {
    const {core} = context;

    if(!core.population) {
        return;
    }

    for(let i in core.population) {
        maintainCreep(`defender${i}`,
            creeps.bodies[core.population[i].body],
            context,
            creeps.behaviors[core.population[i].behavior]);
    }
};

const antinuke = function antinuke(context) {
    const { core, ramparts, roomObjects, bulk, gameTime } = context;
    if(!!(gameTime % 10)) {
        return;
    }
    const nukes = _.filter(roomObjects, {type: 'nuke'});

    const baseLevel = C.STRONGHOLD_RAMPART_HITS[core.level];
    for(let rampart of ramparts) {
        if(_.some(roomObjects, {type: C.STRUCTURE_CONTAINER, x: rampart.x, y: rampart.y})) {
            continue;
        }
        let hitsTarget = baseLevel;
        _.forEach(nukes, n => {
            const range = utils.dist(rampart, n);
            if(range == 0) {
                hitsTarget += C.NUKE_DAMAGE[0];
                return;
            }
            if(range <= 2) {
                hitsTarget += C.NUKE_DAMAGE[2];
            }
        });
        if(rampart.hitsTarget != hitsTarget) {
            bulk.update(rampart, {hitsTarget});
        }
    }
};

const assignDefenders = function assignDefenders(context) {
    let rangerSpots = [], meleeSpots = [];
    _.forEach(context.hostiles, h => {
        meleeSpots.push(..._.filter(context.ramparts, r => utils.dist(h, r) <= 1));
        rangerSpots.push(..._.filter(context.ramparts, r => utils.dist(h, r) <= 3));
    });
    meleeSpots = _.unique(meleeSpots);
    rangerSpots = _.unique(_.without(rangerSpots, ...meleeSpots));
    const rangers = [], melees = [];
    _.forEach(context.defenders, d => {
        if(_.some(d.body, {type: C.ATTACK})) { melees.push(d._id.toString()); }
        if(_.some(d.body, {type: C.RANGED_ATTACK})) { rangers.push(d._id.toString()); }
    });

    let spots = {};
    if(_.some(meleeSpots) && _.some(melees)) {
        spots = defence.distribute(meleeSpots, melees);
    }
    if(_.some(rangerSpots) && _.some(rangers)) {
        Object.assign(spots, defence.distribute(rangerSpots, rangers));
    }

    return spots;
};

module.exports = {
    behaviors: {
        'deploy': function(context) {
            handleController(context);
            deployStronghold(context);
        },
        'default': function(context){
            handleController(context);
            refillTowers(context);
            focusClosest(context);
        },
        'bunker1': function(context) {
            handleController(context);
            refillTowers(context) || refillCreeps(context);
            focusClosest(context);
        },
        'bunker2': function(context) {
            handleController(context);
            refillTowers(context) || refillCreeps(context);

            const { core, bulk } = context;
            if(!core.population) {
                bulk.update(core, {
                    population: [{body: 'weakDefender', behavior: 'simple-melee'}]
                });
            }

            maintainPopulation(context);

            focusClosest(context);
        },
        'bunker3': function(context) {
            handleController(context);
            refillTowers(context);

            const { core, bulk } = context;
            if(!core.population) {
                bulk.update(core, {
                    population: [
                        {body: 'fullDefender', behavior: 'simple-melee'},
                        {body: 'fullDefender', behavior: 'simple-melee'},
                    ]
                });
            }

            maintainPopulation(context);

            focusClosest(context);
        },
        'bunker4': function(context) {
            handleController(context);
            refillTowers(context) || refillCreeps(context);


            const { core, bulk } = context;
            if(!core.population) {
                const populationDeck = [
                    {body: 'fortifier', behavior: 'fortifier'},
                    ...new Array(4).fill({body: 'boostedDefender', behavior: 'coordinated'}),
                    ...new Array(3).fill({body: 'boostedRanger', behavior: 'coordinated'})
                ];

                bulk.update(core, {
                    population: _(populationDeck).shuffle().take(4).value()
                });
            }

            context.spots = assignDefenders(context);

            maintainPopulation(context);

            towersMaintenance(context);
            focusMax(context);
        },
        'bunker5': function(context) {
            handleController(context);
            refillTowers(context) || refillCreeps(context);

            const { core, bulk } = context;
            if(!core.population) {
                const populationDeck = _.shuffle([
                    {body: 'fortifier', behavior: 'fortifier'},
                    ...new Array(7).fill({body: 'fullBoostedMelee', behavior: 'coordinated'}),
                    ...new Array(9).fill({body: 'fullBoostedRanger', behavior: 'coordinated'})
                ]);

                bulk.update(core, {
                    population: [
                        {body: 'fortifier', behavior: 'fortifier'},
                        ..._(populationDeck).shuffle().take(8).value()
                    ]
                });
            }

            antinuke(context);

            context.spots = assignDefenders(context);

            maintainPopulation(context);

            towersMaintenance(context);
            focusMax(context);
        },
    }
};
