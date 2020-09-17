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

        it('Lab with energy should be compatible with all resources', () => {
            const lab = {
                type: "lab",
                store: { energy: 2000 },
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

    describe('Intents sanitizer', () => {
        let runtimeData;
        beforeEach(() => {
            runtimeData = {
                userObjects: {
                    '5dbaca29ca637207bc2d472b': {
                        _id: "5dbaca29ca637207bc2d472b",
                        name: "Test",
                        className: "operator",
                        user: "2",
                        level: 0,
                        hitsMax: 1000,
                        store: {},
                        storeCapacity: 100,
                        powers: {},
                        deleteTime: null,
                        shard: null,
                        spawnCooldownTime: null
                    },
                    '5e174af45ac1eb59e83fc03b': {
                        _id: "5e174af45ac1eb59e83fc03b",
                        name: "Test2",
                        className: "operator",
                        user: "2",
                        level: 0,
                        hitsMax: 1000,
                        store: {},
                        storeCapacity: 100,
                        spawnCooldownTime: 0,
                        powers: {}
                    }
                },
                roomObjects: {
                    '5c3f86c72071261a0c27cd9e': {
                        _id: "5c3f86c72071261a0c27cd9e",
                        type: "observer",
                        x: 23,
                        y: 8,
                        room: "E2S7",
                        user: "2",
                        hits: 500,
                        hitsMax: 500,
                        observeRoom: null
                    },
                    '5c3f86c72071261a0c27cd9f': {
                        _id: "5c3f86c72071261a0c27cd9f",
                        type: "observer",
                        x: 23,
                        y: 8,
                        room: "E2N7",
                        user: "2",
                        hits: 500,
                        hitsMax: 500,
                        observeRoom: null
                    },
                    '597eac723cab64605b6de01f': {
                        _id: "597eac723cab64605b6de01f",
                        type: "link",
                        x: 22,
                        y: 23,
                        room: "E2S7",
                        user: "2",
                        cooldown: 0,
                        hits: 1000,
                        hitsMax: 1000,
                        actionLog: {transferEnergy: null},
                        store: {energy: 800},
                        storeCapacityResource: {energy: 800}
                    },
                    '5d028696b51b9c0ae4056d57': {
                        _id: "5d028696b51b9c0ae4056d57",
                        type: "link",
                        x: 12,
                        y: 14,
                        room: "E2S7",
                        user: "2",
                        store: {energy: 0},
                        storeCapacityResource: {energy: 800},
                        cooldown: 0,
                        hits: 1000,
                        hitsMax: 1000,
                        actionLog: {transferEnergy: null}
                    }
                }
            };
        });

        describe('Notify intents processing', () => {
            it('Single notify intent processed', () => {
                const input = {notify: [{message:"test", groupInterval: 10}]};

                const result = utils.storeIntents('2', input, runtimeData);

                expect(result).toBeDefined();
                expect(result.notify).toBeDefined();
                expect(_.isArray(result.notify)).toBeTruthy();
                expect(result.notify.length).toEqual(1);
                expect(result.notify[0].message).toEqual("test");
                expect(result.notify[0].groupInterval).toEqual(10);
            });
        });

        describe('Global intents processing', () => {
            it('Single global intent processed', () => {
                const input = {global: {createPowerCreep:[{name:"Test2",className:"operator"}]}};

                const result = utils.storeIntents('2', input, runtimeData);

                expect(result).toBeDefined();

                expect(result.global).toBeDefined();
                expect(result.global.createPowerCreep).toBeDefined();
                expect(_.isArray(result.global.createPowerCreep)).toBeTruthy();
                expect(result.global.createPowerCreep.length).toEqual(1);
                expect(result.global.createPowerCreep[0].name).toEqual("Test2");
                expect(result.global.createPowerCreep[0].className).toEqual("operator");
            });

            it('Multiple global intents processed', () => {
                const input = {
                    global: {
                        createPowerCreep: [{name:"Test2",className:"operator"}],
                        renamePowerCreep: [{id: "5dbaca29ca637207bc2d472b", name: 'Test3'}]
                    }};

                const result = utils.storeIntents('2', input, runtimeData);

                expect(result).toBeDefined();
                expect(result.global).toBeDefined();

                expect(result.global.createPowerCreep).toBeDefined();
                expect(_.isArray(result.global.createPowerCreep)).toBeTruthy();
                expect(result.global.createPowerCreep.length).toEqual(1);
                expect(result.global.createPowerCreep[0].name).toEqual("Test2");
                expect(result.global.createPowerCreep[0].className).toEqual("operator");

                expect(result.global.renamePowerCreep).toBeDefined();
                expect(_.isArray(result.global.renamePowerCreep)).toBeTruthy();
                expect(result.global.renamePowerCreep.length).toEqual(1);
                expect(result.global.renamePowerCreep[0].id).toEqual("5dbaca29ca637207bc2d472b");
                expect(result.global.renamePowerCreep[0].name).toEqual("Test3");
            });

            it('Unknown fields removed from global intents', () => {
                const input = {global: {createPowerCreep:[{name:"Test2",className:"operator",unknownField:"boo!"}]}};

                const result = utils.storeIntents('2', input, runtimeData);

                expect(result.global.createPowerCreep[0].unknownField).toBeUndefined();
            });

            it('Unknown global intents removed', () => {
                const input = {global: {unknownIntent:[{unknownField:"boo!"}]}};

                const result = utils.storeIntents('2', input, runtimeData);

                expect(_.size(result.global)).toEqual(0);
            });
        });

        describe('Rooms intents processing', () => {
            beforeEach(()=>{
            });

            it('Single room intent processed', () => {
                const input = {
                    room: {
                        createConstructionSite: [
                            {roomName:"E2S5",x:20,y:30,structureType:"road"}]
                    }
                };

                const result = utils.storeIntents('2', input, runtimeData);

                expect(result).toBeDefined();

                expect(result['E2S5']).toBeDefined();
                expect(result['E2S5'].room).toBeDefined();
                expect(result['E2S5'].room.createConstructionSite).toBeDefined();
                expect(_.isArray(result['E2S5'].room.createConstructionSite)).toBeTruthy();
                expect(result['E2S5'].room.createConstructionSite.length).toEqual(1);
                expect(result['E2S5'].room.createConstructionSite[0].x).toEqual(20);
                expect(result['E2S5'].room.createConstructionSite[0].y).toEqual(30);
                expect(result['E2S5'].room.createConstructionSite[0].structureType).toEqual("road");
            });

            it('Multiple room intents in a single room processed', () => {
                const input = {
                    room: {
                        createConstructionSite: [
                            {roomName:"E2S5",x:20,y:30,structureType:"road"},
                            {roomName:"E2S5",x:25,y:33,structureType:"factory"}
                        ]
                    }
                };

                const result = utils.storeIntents('2', input, runtimeData);
                expect(result).toBeDefined();
                expect(result['E2S5']).toBeDefined();
                expect(result['E2S5'].room).toBeDefined();
                expect(result['E2S5'].room.createConstructionSite).toBeDefined();
                expect(_.isArray(result['E2S5'].room.createConstructionSite)).toBeTruthy();
                expect(result['E2S5'].room.createConstructionSite.length).toEqual(2);
            });

            it('Multiple room intents in multiple rooms processed', () => {
                const input = {
                    room: {
                        createConstructionSite: [
                            {roomName:"E2S5",x:20,y:30,structureType:"road"},
                            {roomName:"E2S7",x:25,y:33,structureType:"factory"},
                            {roomName:"E2S7",x:25,y:35,structureType:"terminal"}
                        ]
                    }
                };

                const result = utils.storeIntents('2', input, runtimeData);
                expect(result).toBeDefined();
                expect(result['E2S5']).toBeDefined();
                expect(result['E2S5'].room).toBeDefined();
                expect(result['E2S5'].room.createConstructionSite).toBeDefined();
                expect(_.isArray(result['E2S5'].room.createConstructionSite)).toBeTruthy();
                expect(result['E2S5'].room.createConstructionSite.length).toEqual(1);
                expect(result['E2S7']).toBeDefined();
                expect(result['E2S7'].room).toBeDefined();
                expect(result['E2S7'].room.createConstructionSite).toBeDefined();
                expect(_.isArray(result['E2S7'].room.createConstructionSite)).toBeTruthy();
                expect(result['E2S7'].room.createConstructionSite.length).toEqual(2);
            });

            it('Unknown fields removed from room intents', () => {
                const input = {
                    room: {
                        createConstructionSite: [{roomName:"E2S5",x:20,y:30,structureType:"road",unknownField:"boo"}]
                    }
                };

                const result = utils.storeIntents('2', input, runtimeData);

                expect(result['E2S5'].room.createConstructionSite[0].unknownField).toBeUndefined();
            });

            it('Unknown room intents removed', () => {
                const input = {
                    room: {
                        unknownIntent: [{unknownField:"boo"}]
                    }
                };

                const result = utils.storeIntents('2', input, runtimeData);

                expect(result).toBeDefined();
                expect(_.size(result)).toEqual(0);
            });
        });

        describe('Object intents processing', () => {
            it('Single object intent processed', () => {
                const input = {
                    '5c3f86c72071261a0c27cd9e': {observeRoom:{roomName:"E0N0"}}
                };

                const result = utils.storeIntents('2', input, runtimeData);

                expect(result).toBeDefined();

                expect(result['E2S7']).toBeDefined();
                expect(result['E2S7']['5c3f86c72071261a0c27cd9e']).toBeDefined();
                expect(result['E2S7']['5c3f86c72071261a0c27cd9e'].observeRoom).toBeDefined();
                expect(result['E2S7']['5c3f86c72071261a0c27cd9e'].observeRoom.roomName).toEqual('E0N0');
            });

            it('Multiple object intents processed in a single room', () => {
                const input = {
                    '5c3f86c72071261a0c27cd9e': {observeRoom: {roomName:"E0N0"}},
                    '597eac723cab64605b6de01f': {transfer: {id: '5d028696b51b9c0ae4056d57', resourceType: 'energy', amount: 800}}
                };

                const result = utils.storeIntents('2', input, runtimeData);

                expect(result['E2S7']).toBeDefined();

                expect(result['E2S7']['5c3f86c72071261a0c27cd9e']).toBeDefined();
                expect(result['E2S7']['5c3f86c72071261a0c27cd9e'].observeRoom).toBeDefined();
                expect(result['E2S7']['5c3f86c72071261a0c27cd9e'].observeRoom.roomName).toEqual('E0N0');

                expect(result['E2S7']['597eac723cab64605b6de01f']).toBeDefined();
                expect(result['E2S7']['597eac723cab64605b6de01f'].transfer).toBeDefined();
                expect(result['E2S7']['597eac723cab64605b6de01f'].transfer.id).toEqual('5d028696b51b9c0ae4056d57');
                expect(result['E2S7']['597eac723cab64605b6de01f'].transfer.resourceType).toEqual('energy');
                expect(result['E2S7']['597eac723cab64605b6de01f'].transfer.amount).toEqual(800);
            });

            it('Multiple object intents processed in multiple rooms', () => {
                const input = {
                    '5c3f86c72071261a0c27cd9f': {observeRoom: {roomName:"E0N0"}},
                    '597eac723cab64605b6de01f': {transfer: {id: '5d028696b51b9c0ae4056d57', resourceType: 'energy', amount: 800}}
                };

                const result = utils.storeIntents('2', input, runtimeData);

                expect(result['E2N7']).toBeDefined();

                expect(result['E2N7']['5c3f86c72071261a0c27cd9f']).toBeDefined();
                expect(result['E2N7']['5c3f86c72071261a0c27cd9f'].observeRoom).toBeDefined();
                expect(result['E2N7']['5c3f86c72071261a0c27cd9f'].observeRoom.roomName).toEqual('E0N0');

                expect(result['E2S7']).toBeDefined();
                expect(result['E2S7']['597eac723cab64605b6de01f']).toBeDefined();
                expect(result['E2S7']['597eac723cab64605b6de01f'].transfer).toBeDefined();
                expect(result['E2S7']['597eac723cab64605b6de01f'].transfer.id).toEqual('5d028696b51b9c0ae4056d57');
                expect(result['E2S7']['597eac723cab64605b6de01f'].transfer.resourceType).toEqual('energy');
                expect(result['E2S7']['597eac723cab64605b6de01f'].transfer.amount).toEqual(800);
            });

            it('Unknown fields removed from object intents', () => {
                const input = {
                    '5c3f86c72071261a0c27cd9e': {observeRoom:{roomName:"E0N0", unknownField:"boo"}}
                };

                const result = utils.storeIntents('2', input, runtimeData);

                expect(result['E2S7']['5c3f86c72071261a0c27cd9e'].observeRoom.unknownField).toBeUndefined();
            });

            it('Unknown object intents removed', () => {
                const input = {
                    '5c3f86c72071261a0c27cd9e': {unknownIntent: {unknownField:"boo"}}
                };

                const result = utils.storeIntents('2', input, runtimeData);

                expect(result).toBeDefined();
                expect(_.size(result['E2S7']['5c3f86c72071261a0c27cd9e'])).toEqual(0);
            });
        });
    });
});
