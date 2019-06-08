const _ = require('lodash'),
    utils =  require('../../src/utils'),
    driver = utils.getDriver(),
    C = driver.constants;

describe('Utils', () => {
    beforeEach(()=>{
    });

    describe('calcTerminalEnergyCost', () => {
        it('Should cost something to send resources',()=>{
            expect(utils.calcTerminalEnergyCost(1, 1)).toBeGreaterThan(0);
        });

        it('Should not cost something to not send resources',()=>{
            expect(utils.calcTerminalEnergyCost(10, 0)).toBe(0);
        });
    });

    describe('capacityForResource', () => {
        it('Spawner is compatible with energy only', () => {
            const spawner = {
                type: "spawn",
                store: { energy: 300 },
                storeCapacityResource: { energy: 300 }
            };

            C.RESOURCES_ALL.forEach(r => {
                expect(utils.capacityForResource(spawner, r)).toBe( r == C.RESOURCE_ENERGY ? 300 : 0);
            });
        });

        it('Container is compatible with all resources', () => {
            const container = {
                type: "container",
                store: { energy: 0 },
                storeCapacity: 2000
            };

            C.RESOURCES_ALL.forEach(r => {
                expect(utils.capacityForResource(container, r)).toBe(2000);
            });
        });

        it('Nuker is compatible with G and energy only', () => {
            const nuker = {
                type: "nuker",
                store: { energy: 0, G: 0 },
                storeCapacityResource: { energy: 300000, G: 5000 }
            };

            C.RESOURCES_ALL.forEach(r => {
                if(r == 'energy') {
                    expect(utils.capacityForResource(nuker, r)).toBe(300000);
                    return;
                }
                if(r == 'G') {
                    expect(utils.capacityForResource(nuker, r)).toBe(5000);
                    return;
                }
                expect(utils.capacityForResource(nuker, r)).toBe( 0);
            });
        });

        it('Empty lab should be compatible with all resources', () => {
            const lab = {
                type: "lab",
                store: { energy: 0 },
                storeCapacity: 5000,
                storeCapacityResource: {energy: 2000 }
            };

            C.RESOURCES_ALL.forEach(r => {
                if(r == 'energy') {
                    expect(utils.capacityForResource(lab, r)).toBe(2000);
                    return;
                }
                expect(utils.capacityForResource(lab, r)).toBe( 3000);
            });
        });

        it('Lab with a reagent should be compatible with energy and the reagent', () => {
            const lab = {
                type: "lab",
                store: { energy: 0, UO: 1000 },
                storeCapacityResource: {energy: 2000, UO: 3000 }
            };

            C.RESOURCES_ALL.forEach(r => {
                if(r == 'energy') {
                    expect(utils.capacityForResource(lab, r)).toBe(2000);
                    return;
                }
                if(r == 'UO') {
                    expect(utils.capacityForResource(lab, r)).toBe(3000);
                    return;
                }
                expect(utils.capacityForResource(lab, r)).toBe( 0);
            });
        });
    });
});
