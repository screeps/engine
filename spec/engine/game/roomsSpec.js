const _ =require('lodash'),
    utils = require('../../../src/utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    rooms = require('../../../src/game/rooms');

describe('rooms', () => {
    describe('RoomPosition', () => {
        let globals;

        beforeEach(()=>{
            globals = {}
            const runtimeData = {
                staticTerrainData: require('../../helpers/mocks/rooms').terrain
            };
            const register = {
                wrapFn: function(fn) { return fn },
                rooms: { E2S7: {} },
                _useNewPathFinder: true,
            };

            rooms.make(runtimeData, {}, register, globals);
            rooms.makePos(register);
        
            for (var i in runtimeData.rooms) {
                register.rooms[i] = new globals.Room(i);
            }
        });

        it('Exists',()=>{
            expect(globals.RoomPosition).toBeDefined();
        });

        it('Preserves coordinates', ()=>{
            const pos = new globals.RoomPosition(11,14,'E2S7');

            expect(pos).toBeDefined();
            expect(pos.x).toBe(11);
            expect(pos.y).toBe(14);
            expect(pos.roomName).toBe('E2S7');
        });

        it('Mutates x properly', ()=>{
            const pos = new globals.RoomPosition(11,14,'E2S7');

            pos.x++;

            expect(pos).toBeDefined();
            expect(pos.x).toBe(12);
            expect(pos.y).toBe(14);
            expect(pos.roomName).toBe('E2S7');
        });

        it('Mutates y properly', ()=>{
            const pos = new globals.RoomPosition(11,14,'E2S7');

            pos.y++;

            expect(pos).toBeDefined();
            expect(pos.x).toBe(11);
            expect(pos.y).toBe(15);
            expect(pos.roomName).toBe('E2S7');
        });

        describe("findClosestByPath", () => {
            const newPos = ({x}) => new globals.RoomPosition(x, 0, "E2S7");

            it("Finds target according to PathFinder", () => {
                const pos = newPos({ x: 0 });
                const closeTarget = newPos({ x: 5 });
                const farTarget = newPos({ x: 10 });

                globals.PathFinder = {
                    search: () => ({
                        // Only last position of a path is considered in search
                        path: [closeTarget],
                    })
                }

                const result = pos.findClosestByPath([
                    closeTarget,
                    farTarget,
                ]);

                expect(result).toEqual(closeTarget);
            });

            it("Finds target with range option", () => {
                const range = 2;
                const targetX = 5;

                const pos = newPos({ x: 0 });
                const target = newPos({ x: targetX });
                const pathEnd = newPos({ x: targetX - range });

                globals.PathFinder = {
                    search: () => ({
                        // Only last position of a path is considered in search
                        path: [pathEnd],
                    })
                }
                const searchSpy = spyOn(globals.PathFinder, 'search').and.callThrough()

                const result = pos.findClosestByPath([target], { range });

                expect(result).toEqual(target);
                expect(searchSpy.calls.count()).toBe(1)
                expect(searchSpy.calls.argsFor(0)[0]).toEqual(pos)
                expect(searchSpy.calls.argsFor(0)[1].length).toBe(1)
                expect(searchSpy.calls.argsFor(0)[1]).toContain({ range, pos: target })
            })

            it("Fails to find target out of range", () => {
                const range = 2;
                const targetX = 5;

                const pos = newPos({ x: 0 });
                const target = newPos({ x: targetX });
                const pathEnd = newPos({ x: targetX - range - 1 });

                globals.PathFinder = {
                    search: () => ({
                        // Only last position of a path is considered in search
                        path: [pathEnd],
                    })
                }

                const result = pos.findClosestByPath([target], { range });

                expect(result).toEqual(null);
            })

            it("Picks first target in range of the path even if it's further away", () => {
                const range = 2;

                const pos = newPos({ x: 0 });
                const targetOut = newPos({ x: 3 });
                const targetFar = newPos({ x: 2 });
                const targetNear = newPos({ x: 1 });

                globals.PathFinder = {
                    search: () => ({
                        // Only last position of a path is considered in search
                        path: [],
                    })
                }

                const result = pos.findClosestByPath([targetOut, targetFar, targetNear], { range });

                expect(result).toEqual(targetFar);
            })
        });
    });
});