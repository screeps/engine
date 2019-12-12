const _ = require('lodash'),
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
                expect(containerStore[r]).toBe(0);
            });
        });

        it('For...in contains energy only', () => {
            const keys = [];
            for(let key in containerStore) {
                keys.push(key);
            }

            expect(keys).toEqual([]);
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

            expect(keys).toEqual(['energy', 'ops']);
        });
    });

    describe('Store.getCapacity', () => {
        // energy-only structures: spawner, extension, tower, creep, power creep
        describe('Spawner', () => {
            let spawnerStore;
            beforeEach(()=>{
                const spawner = {
                    type: "spawn",
                    store: { energy: 300 },
                    storeCapacityResource: { energy: 300 }
                };
                spawnerStore = new globals.Store(spawner);
            });

            it('May contain 300 energy', () => {
                expect(spawnerStore.getCapacity('energy')).toBe(300);
            });

            it('Not compatible with random resource', () => {
                expect(spawnerStore.getCapacity()).toBeNull();
            });

            it('Not compatible with power', () => {
                expect(spawnerStore.getCapacity('power')).toBeNull();
            });

            it('Not compatible with minerals', () => {
                expect(spawnerStore.getCapacity('H')).toBeNull();
            });

            it('Not compatible with boosts', () => {
                expect(spawnerStore.getCapacity('XGH2O')).toBeNull();
            });

            it('Not compatible with commodities', () => {
                expect(spawnerStore.getCapacity('purifier')).toBeNull();
            });
        });

        // specialized structures: power spawn, nuker
        describe('PowerSpawn', () => {
            let psStore;
            beforeEach(()=>{
                const powerSpawner = {
                    type: "powerSpawn",
                    store: { energy: 0 },
                    storeCapacityResource: { energy: 5000, power: 100 }
                };
                psStore = new globals.Store(powerSpawner);
            });

            it('May contain 5000 energy', () => {
                expect(psStore.getCapacity('energy')).toBe(5000);
            });

            it('May contain 100 power', () => {
                expect(psStore.getCapacity('power')).toBe(100);
            });

            it('Not compatible with random resource', () => {
                expect(psStore.getCapacity()).toBeNull();
            });

            it('Not compatible with minerals', () => {
                expect(psStore.getCapacity('H')).toBeNull();
            });

            it('Not compatible with boosts', () => {
                expect(psStore.getCapacity('XGH2O')).toBeNull();
            });

            it('Not compatible with commodities', () => {
                expect(psStore.getCapacity('purifier')).toBeNull();
            });
        });

        // general purpose stores: storage, terminal, factory, container
        describe('Container', () => {
            let containerStore;
            beforeEach(()=>{
                containerStore = new globals.Store({
                    type: "container",
                    store: { energy: 1000, ops: 50, H: 0 },
                    storeCapacity: 2000
                });
            });

            it('May contain 2000 energy', () => {
                expect(containerStore.getCapacity('energy')).toBe(2000);
            });

            it('Compatible with any resource', () => {
                expect(containerStore.getCapacity()).toBe(2000);
            });

            it('Compatible with minerals', () => {
                expect(containerStore.getCapacity('H')).toBe(2000);
            });

            it('Compatible with boosts', () => {
                expect(containerStore.getCapacity('XGH2O')).toBe(2000);
            });

            it('Compatible with commodities', () => {
                expect(containerStore.getCapacity('purifier')).toBe(2000);
            });
        });

        describe('Tombstone', () => {
            let tombstoneStore;
            beforeEach(()=>{
                tombstoneStore = new globals.Store({
                    type: "tombstone",
                    store: { energy: 1000, ops: 50, H: 0 }
                });
            });

            it('May not contain energy', () => {
                expect(tombstoneStore.getCapacity('energy')).toBeNull();
            });

            it('May not contain any resource', () => {
                expect(tombstoneStore.getCapacity()).toBeNull();
            });

            it('May not contain minerals', () => {
                expect(tombstoneStore.getCapacity('H')).toBeNull();
            });

            it('May not contain boosts', () => {
                expect(tombstoneStore.getCapacity('XGH2O')).toBeNull();
            });

            it('May not contain commodities', () => {
                expect(tombstoneStore.getCapacity('purifier')).toBeNull();
            });
        });

        describe('Empty lab', () => {
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

            it('May contain 2000 energy', () => {
                expect(labStore.getCapacity('energy')).toBe(2000);
            });

            it('Not compatible with any resource', () => {
                expect(labStore.getCapacity()).toBeNull();
            });

            it('Compatible with minerals', () => {
                expect(labStore.getCapacity('H')).toBe(3000);
            });

            it('Compatible with boosts', () => {
                expect(labStore.getCapacity('UO')).toBe(3000);
            });
        });

        describe('Non-empty lab', () => {
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

            it('May contain 2000 energy', () => {
                expect(labStore.getCapacity('energy')).toBe(2000);
            });

            it('Not compatible with any resource', () => {
                expect(labStore.getCapacity()).toBeNull();
            });

            it('Compatible with contained mineral', () => {
                expect(labStore.getCapacity('UO')).toBe(3000);
            });

            it('Not compatible with not contained mineral', () => {
                expect(labStore.getCapacity('H')).toBeNull();
            });
        });
    });

    describe('Store.getUsedCapacity', () => {
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

            it('Contains 100 energy', () => {
                expect(spawnerStore.getUsedCapacity('energy')).toBe(100);
            });

            it('Not compatible with random resource', () => {
                expect(spawnerStore.getUsedCapacity()).toBeNull();
            });

            it('Not compatible with power', () => {
                expect(spawnerStore.getUsedCapacity('power')).toBeNull();
            });

            it('Not compatible with minerals', () => {
                expect(spawnerStore.getUsedCapacity('H')).toBeNull();
            });

            it('Not compatible with boosts', () => {
                expect(spawnerStore.getUsedCapacity('XGH2O')).toBeNull();
            });

            it('Not compatible with commodities', () => {
                expect(spawnerStore.getUsedCapacity('purifier')).toBeNull();
            });
        });

        // specialized structures: power spawn, nuker
        describe('PowerSpawn', () => {
            let psStore;
            beforeEach(()=>{
                const powerSpawner = {
                    type: "powerSpawn",
                    store: { energy: 2500, power: 50 },
                    storeCapacityResource: { energy: 5000, power: 100 }
                };
                psStore = new globals.Store(powerSpawner);
            });

            it('Contains 2500 energy', () => {
                expect(psStore.getUsedCapacity('energy')).toBe(2500);
            });

            it('Contains 50 power', () => {
                expect(psStore.getUsedCapacity('power')).toBe(50);
            });

            it('Not compatible with random resource', () => {
                expect(psStore.getUsedCapacity()).toBeNull();
            });

            it('Not compatible with minerals', () => {
                expect(psStore.getUsedCapacity('H')).toBeNull();
            });

            it('Not compatible with boosts', () => {
                expect(psStore.getUsedCapacity('XGH2O')).toBeNull();
            });

            it('Not compatible with commodities', () => {
                expect(psStore.getUsedCapacity('purifier')).toBeNull();
            });
        });

        // general purpose stores: storage, terminal, factory, container
        describe('Container', () => {
            let containerStore;
            beforeEach(()=>{
                containerStore = new globals.Store({
                    type: "container",
                    store: { energy: 1000, ops: 50, H: 0 },
                    storeCapacity: 2000
                });
            });

            it('Contains 1000 energy', () => {
                expect(containerStore.getUsedCapacity('energy')).toBe(1000);
            });

            it('Compatible with any resource', () => {
                expect(containerStore.getCapacity()).toBe(2000);
            });

            it('Compatible with minerals', () => {
                expect(containerStore.getCapacity('H')).toBe(2000);
            });

            it('Compatible with boosts', () => {
                expect(containerStore.getCapacity('XGH2O')).toBe(2000);
            });

            it('Compatible with commodities', () => {
                expect(containerStore.getCapacity('purifier')).toBe(2000);
            });
        });

        describe('Tombstone', () => {
            let tombstoneStore;
            beforeEach(()=>{
                tombstoneStore = new globals.Store({
                    type: "tombstone",
                    store: { energy: 1000, H: 50 }
                });
            });

            it('Contains 1000 energy', () => {
                expect(tombstoneStore.getUsedCapacity('energy')).toBe(1000);
            });

            it('Contains 50 minerals', () => {
                expect(tombstoneStore.getUsedCapacity('H')).toBe(50);
            });

            it('Does not contain boosts', () => {
                expect(tombstoneStore.getUsedCapacity('XGH2O')).toBeNull();
            });

            it('Does not contain commodities', () => {
                expect(tombstoneStore.getUsedCapacity('purifier')).toBeNull();
            });
        });

        describe('Empty lab', () => {
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

            it('Contains no energy', () => {
                expect(labStore.getUsedCapacity('energy')).toBe(0);
            });

            it('Not compatible with any resource', () => {
                expect(labStore.getUsedCapacity()).toBeNull();
            });

            it('Compatible with minerals', () => {
                expect(labStore.getUsedCapacity('H')).toBe(0);
            });

            it('Compatible with boosts', () => {
                expect(labStore.getUsedCapacity('UO')).toBe(0);
            });
        });

        describe('Non-empty lab', () => {
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

            it('Contain 800 energy', () => {
                expect(labStore.getUsedCapacity('energy')).toBe(800);
            });

            it('Not compatible with any resource', () => {
                expect(labStore.getUsedCapacity()).toBeNull();
            });

            it('Compatible with contained mineral', () => {
                expect(labStore.getUsedCapacity('UO')).toBe(1200);
            });

            it('Not compatible with not contained mineral', () => {
                expect(labStore.getUsedCapacity('H')).toBeNull();
            });
        });
    });

    describe('Store.getFreeCapacity', () => {
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

            it('Contains 100 energy', () => {
                expect(spawnerStore.getUsedCapacity('energy')).toBe(100);
            });

            it('Not compatible with random resource', () => {
                expect(spawnerStore.getUsedCapacity()).toBeNull();
            });

            it('Not compatible with power', () => {
                expect(spawnerStore.getUsedCapacity('power')).toBeNull();
            });

            it('Not compatible with minerals', () => {
                expect(spawnerStore.getUsedCapacity('H')).toBeNull();
            });

            it('Not compatible with boosts', () => {
                expect(spawnerStore.getUsedCapacity('XGH2O')).toBeNull();
            });

            it('Not compatible with commodities', () => {
                expect(spawnerStore.getUsedCapacity('purifier')).toBeNull();
            });
        });

        // specialized structures: power spawn, nuker
        describe('PowerSpawn', () => {
            let psStore;
            beforeEach(()=>{
                const powerSpawner = {
                    type: "powerSpawn",
                    store: { energy: 2000, power: 10 },
                    storeCapacityResource: { energy: 5000, power: 100 }
                };
                psStore = new globals.Store(powerSpawner);
            });

            it('May contain 3000 more energy', () => {
                expect(psStore.getFreeCapacity('energy')).toBe(3000);
            });

            it('May contains 90 more power', () => {
                expect(psStore.getFreeCapacity('power')).toBe(90);
            });

            it('Not compatible with random resource', () => {
                expect(psStore.getFreeCapacity()).toBeNull();
            });

            it('Not compatible with minerals', () => {
                expect(psStore.getFreeCapacity('H')).toBeNull();
            });

            it('Not compatible with boosts', () => {
                expect(psStore.getFreeCapacity('XGH2O')).toBeNull();
            });

            it('Not compatible with commodities', () => {
                expect(psStore.getFreeCapacity('purifier')).toBeNull();
            });
        });

        // general purpose stores: storage, terminal, factory, container
        describe('Container', () => {
            let containerStore;
            beforeEach(()=>{
                containerStore = new globals.Store({
                    type: "container",
                    store: { energy: 1000, ops: 50, H: 0 },
                    storeCapacity: 2000
                });
            });

            it('Free capacity', () => {
                expect(containerStore.getFreeCapacity()).toBe(950);
            });

            it('Free capacity for resource in storage', () => {
                expect(containerStore.getFreeCapacity('energy')).toBe(950);
            });

            it('Free capacity for resource not in storage', () => {
                expect(containerStore.getFreeCapacity('O')).toBe(950);
            });

            it('Compatible with any resource', () => {
                expect(containerStore.getFreeCapacity()).toBe(950);
            });

            it('Compatible with minerals', () => {
                expect(containerStore.getFreeCapacity('H')).toBe(950);
                expect(containerStore.getFreeCapacity('O')).toBe(950);
            });

            it('Compatible with boosts', () => {
                expect(containerStore.getFreeCapacity('XGH2O')).toBe(950);
            });

            it('Compatible with commodities', () => {
                expect(containerStore.getFreeCapacity('purifier')).toBe(950);
            });
        });

        describe('Tombstone', () => {
            let tombstoneStore;
            beforeEach(()=>{
                tombstoneStore = new globals.Store({
                    type: "tombstone",
                    store: { energy: 1000, H: 50 }
                });
            });

            it('Not compatible with energy', () => {
                expect(tombstoneStore.getFreeCapacity('energy')).toBeNull();
            });

            it('Not compatible with random resource', () => {
                expect(tombstoneStore.getFreeCapacity()).toBeNull();
            });

            it('Not compatible with power', () => {
                expect(tombstoneStore.getFreeCapacity('power')).toBeNull();
            });

            it('Not compatible with minerals', () => {
                expect(tombstoneStore.getFreeCapacity('H')).toBeNull();
            });

            it('Not compatible with boosts', () => {
                expect(tombstoneStore.getFreeCapacity('XGH2O')).toBeNull();
            });

            it('Not compatible with commodities', () => {
                expect(tombstoneStore.getFreeCapacity('purifier')).toBeNull();
            });
        });

        describe('Empty lab', () => {
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

            it('Contains no energy', () => {
                expect(labStore.getFreeCapacity('energy')).toBe(2000);
            });

            it('Not compatible with any resource', () => {
                expect(labStore.getFreeCapacity()).toBeNull();
            });

            it('Compatible with minerals', () => {
                expect(labStore.getFreeCapacity('H')).toBe(3000);
            });

            it('Compatible with boosts', () => {
                expect(labStore.getFreeCapacity('UO')).toBe(3000);
            });
        });

        describe('Non-empty lab', () => {
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

            it('Contain 800 energy', () => {
                expect(labStore.getFreeCapacity('energy')).toBe(1200);
            });

            it('Not compatible with any resource', () => {
                expect(labStore.getFreeCapacity()).toBeNull();
            });

            it('Compatible with contained mineral', () => {
                expect(labStore.getFreeCapacity('UO')).toBe(1800);
            });

            it('Not compatible with not contained mineral', () => {
                expect(labStore.getFreeCapacity('H')).toBeNull();
            });
        });
    });
});
