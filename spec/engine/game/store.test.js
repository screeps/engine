const {describe, it, beforeEach} = require('node:test'),
    assert = require('node:assert/strict'),
    _ = require('lodash'),
    utils =  require('../../../src/utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    store = require('../../../src/game/store');

describe('Store', () => {
    let globals = {};
    beforeEach(()=>{
        store.make({}, {}, { wrapFn: fn => fn }, globals);
    });

    describe('Empty store resources index', () => {
        let containerStore;
        beforeEach(()=>{
            containerStore = new globals.Store({
                type: "container",
                store: { energy: 0, ops: 0 },
                storeCapacity: 2000
            });
        });

        it('Every resource key exists', () => {
            C.RESOURCES_ALL.forEach(r => {
                assert.strictEqual(containerStore[r], 0);
            });
        });

        it('For...in contains energy only', () => {
            const keys = [];
            for(let key in containerStore) {
                keys.push(key);
            }

            assert.deepStrictEqual(keys, []);
        });
    });

    describe('Non-empty store resources index', () => {
        let containerStore;
        beforeEach(()=>{
            containerStore = new globals.Store({
                type: "container",
                store: { energy: 1000, ops: 50, H: 0 },
                storeCapacity: 2000
            });
        });

        it('For...in contains non-zero resources only', () => {
            const keys = [];
            for(let key in containerStore) {
                keys.push(key);
            }

            assert.deepStrictEqual(keys, ['energy', 'ops']);
        });
    });

    // energy-only structures: spawner, extension, tower, creep, power creep
    describe('Spawner', () => {
        let spawnerStore;
        beforeEach(()=>{
            const spawner = {
                type: "spawn",
                store: { energy: 100 },
                storeCapacityResource: { energy: 300 }
            };
            spawnerStore = new globals.Store(spawner);
        });

        it('Compatible with energy', () => {
            assert.strictEqual(spawnerStore.getCapacity('energy'), 300);
            assert.strictEqual(spawnerStore.getUsedCapacity('energy'), 100);
            assert.strictEqual(spawnerStore.getFreeCapacity('energy'), 200);
        });

        it('Not compatible with random resource', () => {
            assert.strictEqual(spawnerStore.getCapacity(), null);
            assert.strictEqual(spawnerStore.getUsedCapacity(), null);
            assert.strictEqual(spawnerStore.getFreeCapacity(), null);
        });

        it('Not compatible with power', () => {
            assert.strictEqual(spawnerStore.getCapacity('power'), null);
            assert.strictEqual(spawnerStore.getUsedCapacity('power'), null);
            assert.strictEqual(spawnerStore.getFreeCapacity('power'), null);
        });

        it('Not compatible with minerals', () => {
            assert.strictEqual(spawnerStore.getCapacity('H'), null);
            assert.strictEqual(spawnerStore.getUsedCapacity('H'), null);
            assert.strictEqual(spawnerStore.getFreeCapacity('H'), null);
        });

        it('Not compatible with boosts', () => {
            assert.strictEqual(spawnerStore.getCapacity('XGH2O'), null);
            assert.strictEqual(spawnerStore.getUsedCapacity('XGH2O'), null);
            assert.strictEqual(spawnerStore.getFreeCapacity('XGH2O'), null);
        });

        it('Not compatible with commodities', () => {
            assert.strictEqual(spawnerStore.getCapacity('purifier'), null);
            assert.strictEqual(spawnerStore.getUsedCapacity('purifier'), null);
            assert.strictEqual(spawnerStore.getFreeCapacity('purifier'), null);
        });
    });

    // specialized structures: power spawn, nuker
    describe('PowerSpawn', () => {
        let psStore;
        beforeEach(()=>{
            const powerSpawner = {
                type: "powerSpawn",
                store: { energy: 2100, power: 40 },
                storeCapacityResource: { energy: 5000, power: 100 }
            };
            psStore = new globals.Store(powerSpawner);
        });

        it('Compatible with energy', () => {
            assert.strictEqual(psStore.getCapacity('energy'), 5000);
            assert.strictEqual(psStore.getUsedCapacity('energy'), 2100);
            assert.strictEqual(psStore.getFreeCapacity('energy'), 2900);
        });

        it('Compatible with power', () => {
            assert.strictEqual(psStore.getCapacity('power'), 100);
            assert.strictEqual(psStore.getUsedCapacity('power'), 40);
            assert.strictEqual(psStore.getFreeCapacity('power'), 60);
        });

        it('Not compatible with random resource', () => {
            assert.strictEqual(psStore.getCapacity(), null);
            assert.strictEqual(psStore.getUsedCapacity(), null);
            assert.strictEqual(psStore.getFreeCapacity(), null);
        });

        it('Not compatible with minerals', () => {
            assert.strictEqual(psStore.getCapacity('H'), null);
            assert.strictEqual(psStore.getUsedCapacity('H'), null);
            assert.strictEqual(psStore.getFreeCapacity('H'), null);
        });

        it('Not compatible with boosts', () => {
            assert.strictEqual(psStore.getCapacity('XGH2O'), null);
            assert.strictEqual(psStore.getUsedCapacity('XGH2O'), null);
            assert.strictEqual(psStore.getFreeCapacity('XGH2O'), null);
        });

        it('Not compatible with commodities', () => {
            assert.strictEqual(psStore.getCapacity('purifier'), null);
            assert.strictEqual(psStore.getUsedCapacity('purifier'), null);
            assert.strictEqual(psStore.getFreeCapacity('purifier'), null);
        });
    });

    // active general purpose stores: storage, terminal, factory, container
    describe('Storage (active)', () => {
        let storageStore;
        beforeEach(()=>{
            storageStore = new globals.Store({
                type: "storage",
                store: { energy: 1000, H: 200, XGH2O: 100, purifier: 50, power: 10 },
                storeCapacity: 2000
            });
        });

        it('Compatible with energy', () => {
            assert.strictEqual(storageStore.getCapacity('energy'), 2000);
            assert.strictEqual(storageStore.getUsedCapacity('energy'), 1000);
            assert.strictEqual(storageStore.getFreeCapacity('energy'), 640);
        });

        it('Compatible with random resource', () => {
            assert.strictEqual(storageStore.getCapacity(), 2000);
            assert.strictEqual(storageStore.getUsedCapacity(), 1360);
            assert.strictEqual(storageStore.getFreeCapacity(), 640);
        });

        it('Compatible with power', () => {
            assert.strictEqual(storageStore.getCapacity('power'), 2000);
            assert.strictEqual(storageStore.getUsedCapacity('power'), 10);
            assert.strictEqual(storageStore.getFreeCapacity('power'), 640);
        });

        it('Compatible with minerals', () => {
            assert.strictEqual(storageStore.getCapacity('H'), 2000);
            assert.strictEqual(storageStore.getUsedCapacity('H'), 200);
            assert.strictEqual(storageStore.getUsedCapacity('O'), 0);
            assert.strictEqual(storageStore.getFreeCapacity('H'), 640);
            assert.strictEqual(storageStore.getFreeCapacity('O'), 640);
        });

        it('Compatible with boosts', () => {
            assert.strictEqual(storageStore.getCapacity('XGH2O'), 2000);
            assert.strictEqual(storageStore.getUsedCapacity('XGH2O'), 100);
            assert.strictEqual(storageStore.getFreeCapacity('XGH2O'), 640);
        });

        it('Compatible with commodities', () => {
            assert.strictEqual(storageStore.getCapacity('purifier'), 2000);
            assert.strictEqual(storageStore.getUsedCapacity('purifier'), 50);
            assert.strictEqual(storageStore.getFreeCapacity('purifier'), 640);
        });
    });

    // inactive general purpose stores: storage, terminal, factory, container
    describe('Storage (inactive)', () => {
        let storageStore;
        beforeEach(()=>{
            storageStore = new globals.Store({
                type: "storage",
                store: { energy: 1000, H: 200, XGH2O: 100, purifier: 50, power: 10 },
                storeCapacity: 0
            });
        });

        it('Not compatible with energy', () => {
            assert.strictEqual(storageStore.getCapacity('energy'), null);
            assert.strictEqual(storageStore.getFreeCapacity('energy'), null);
            assert.strictEqual(storageStore.getUsedCapacity('energy'), 1000);
        });

        it('Not compatible with random resource', () => {
            assert.strictEqual(storageStore.getCapacity(), null);
            assert.strictEqual(storageStore.getFreeCapacity(), null);
            assert.strictEqual(storageStore.getUsedCapacity(), 1360);
        });

        it('Not compatible with power', () => {
            assert.strictEqual(storageStore.getCapacity('power'), null);
            assert.strictEqual(storageStore.getFreeCapacity('power'), null);
            assert.strictEqual(storageStore.getUsedCapacity('power'), 10);
        });

        it('Not compatible with minerals', () => {
            assert.strictEqual(storageStore.getCapacity('H'), null);
            assert.strictEqual(storageStore.getUsedCapacity('H'), 200);
            assert.strictEqual(storageStore.getUsedCapacity('O'), 0);
            assert.strictEqual(storageStore.getFreeCapacity('H'), null);
            assert.strictEqual(storageStore.getFreeCapacity('O'), null);
        });

        it('Not compatible with boosts', () => {
            assert.strictEqual(storageStore.getCapacity('XGH2O'), null);
            assert.strictEqual(storageStore.getFreeCapacity('XGH2O'), null);
            assert.strictEqual(storageStore.getUsedCapacity('XGH2O'), 100);
        });

        it('Not compatible with commodities', () => {
            assert.strictEqual(storageStore.getCapacity('purifier'), null);
            assert.strictEqual(storageStore.getFreeCapacity('purifier'), null);
            assert.strictEqual(storageStore.getUsedCapacity('purifier'), 50);
        });
    });

    // withdraw-only objects: tombstones, ruins
    describe('Tombstone', () => {
        let tombstoneStore;
        beforeEach(()=>{
            tombstoneStore = new globals.Store({
                type: "tombstone",
                store: { energy: 1000, H: 200, XGH2O: 100, purifier: 50, power: 10 }
            });
        });

        it('Contains 1000 energy', () => {
            assert.strictEqual(tombstoneStore.getUsedCapacity('energy'), 1000);
        });

        it('Contains 10 power', () => {
            assert.strictEqual(tombstoneStore.getUsedCapacity('power'), 10);
        });

        it('Contains 200 mineral', () => {
            assert.strictEqual(tombstoneStore.getUsedCapacity('H'), 200);
        });

        it('Contains 100 boost', () => {
            assert.strictEqual(tombstoneStore.getUsedCapacity('XGH2O'), 100);
        });

        it('Contains 50 commodity', () => {
            assert.strictEqual(tombstoneStore.getUsedCapacity('purifier'), 50);
        });

        it('Not compatible with energy', () => {
            assert.strictEqual(tombstoneStore.getCapacity('energy'), null);
            assert.strictEqual(tombstoneStore.getFreeCapacity('energy'), null);
        });

        it('Contains 1360 resources tital', () => {
            assert.strictEqual(tombstoneStore.getUsedCapacity(), 1360);
        });

        it('Not compatible with random resource', () => {
            assert.strictEqual(tombstoneStore.getCapacity(), null);
            assert.strictEqual(tombstoneStore.getFreeCapacity(), null);
        });

        it('Not compatible with power', () => {
            assert.strictEqual(tombstoneStore.getCapacity('power'), null);
            assert.strictEqual(tombstoneStore.getFreeCapacity('power'), null);
        });

        it('Not compatible with minerals', () => {
            assert.strictEqual(tombstoneStore.getCapacity('H'), null);
            assert.strictEqual(tombstoneStore.getFreeCapacity('H'), null);
        });

        it('Not compatible with boosts', () => {
            assert.strictEqual(tombstoneStore.getCapacity('XGH2O'), null);
            assert.strictEqual(tombstoneStore.getFreeCapacity('XGH2O'), null);
        });

        it('Not compatible with commodities', () => {
            assert.strictEqual(tombstoneStore.getCapacity('purifier'), null);
            assert.strictEqual(tombstoneStore.getFreeCapacity('purifier'), null);
        });
    });

    describe('Lab', () => {
        describe('Empty', () => {
            let labStore;
            beforeEach(()=>{
                labStore = new globals.Store({
                    type: 'lab',
                    store: {},
                    storeCapacity: 5000,
                    storeCapacityResource: {
                        "energy" : 2000,
                        "UO" : null
                    }
                });
            });

            it('Contains no resources', () => {
                assert.strictEqual(labStore.getUsedCapacity(), 0);
            });

            it('Compatible with energy', () => {
                assert.strictEqual(labStore.getCapacity('energy'), 2000);
                assert.strictEqual(labStore.getUsedCapacity('energy'), 0);
                assert.strictEqual(labStore.getFreeCapacity('energy'), 2000);
            });

            it('Not compatible with random resource', () => {
                assert.strictEqual(labStore.getCapacity(), null);
                assert.strictEqual(labStore.getFreeCapacity(), null);
            });

            it('Compatible with minerals', () => {
                assert.strictEqual(labStore.getCapacity('H'), 3000);
                assert.strictEqual(labStore.getUsedCapacity('H'), 0);
                assert.strictEqual(labStore.getFreeCapacity('H'), 3000);
            });

            it('Compatible with boosts', () => {
                assert.strictEqual(labStore.getCapacity('UO'), 3000);
                assert.strictEqual(labStore.getUsedCapacity('UO'), 0);
                assert.strictEqual(labStore.getFreeCapacity('UO'), 3000);
            });
        });

        describe('Containing energy only', () => {
            let labStore;
            beforeEach(()=>{
                labStore = new globals.Store({
                    type: 'lab',
                    store: {
                        energy: 800
                    },
                    storeCapacity: 5000,
                    storeCapacityResource: {
                        energy: 2000,
                        H: null
                    }
                });
            });

            it('Compatible with energy', () => {
                assert.strictEqual(labStore.getCapacity('energy'), 2000);
                assert.strictEqual(labStore.getUsedCapacity('energy'), 800);
                assert.strictEqual(labStore.getFreeCapacity('energy'), 1200);
            });

            it('Сompatible with mineral', () => {
                assert.strictEqual(labStore.getCapacity('H'), 3000);
                assert.strictEqual(labStore.getUsedCapacity('H'), 0);
                assert.strictEqual(labStore.getFreeCapacity('H'), 3000);
            });

            it('Not compatible with random resource', () => {
                assert.strictEqual(labStore.getCapacity(), null);
                assert.strictEqual(labStore.getUsedCapacity(), 800);
                assert.strictEqual(labStore.getFreeCapacity(), null);
            });
        });

        describe('Containing energy and mineral', () => {
            let labStore;
            beforeEach(()=>{
                labStore = new globals.Store({
                    type: 'lab',
                    store: {
                        energy: 800,
                        UO: 1200
                    },
                    storeCapacity: null,
                    storeCapacityResource: {
                        energy: 2000,
                        UO: 3000,
                        H: null
                    }
                });
            });

            it('Compatible with energy', () => {
                assert.strictEqual(labStore.getCapacity('energy'), 2000);
                assert.strictEqual(labStore.getUsedCapacity('energy'), 800);
                assert.strictEqual(labStore.getFreeCapacity('energy'), 1200);
            });

            it('Not compatible with random resource', () => {
                assert.strictEqual(labStore.getCapacity(), null);
                assert.strictEqual(labStore.getUsedCapacity(), null);
                assert.strictEqual(labStore.getFreeCapacity(), null);
            });

            it('Compatible with the same mineral', () => {
                assert.strictEqual(labStore.getCapacity('UO'), 3000);
                assert.strictEqual(labStore.getUsedCapacity('UO'), 1200);
                assert.strictEqual(labStore.getFreeCapacity('UO'), 1800);
            });

            it('Not compatible with not contained mineral', () => {
                assert.strictEqual(labStore.getCapacity('H'), null);
                assert.strictEqual(labStore.getUsedCapacity('H'), null);
                assert.strictEqual(labStore.getFreeCapacity('H'), null);
            });
        });
    });
});
