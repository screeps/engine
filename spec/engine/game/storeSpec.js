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

            it('Contains 300 energy', () => {
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

            it('Contains 5000 energy', () => {
                expect(psStore.getCapacity('energy')).toBe(5000);
            });

            it('Contains 100 power', () => {
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

        describe('Container', () => {
            let containerStore;
            beforeEach(()=>{
                containerStore = new globals.Store({
                    type: "container",
                    store: { energy: 1000, ops: 50, H: 0 },
                    storeCapacity: 2000
                });
            });

            it('Contains 2000 energy', () => {
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
    });
});
