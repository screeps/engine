const _ =require('lodash'),
    utils = require('../../../src/utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    rooms = require('../../../src/game/rooms');

describe('rooms', () => {
    describe('RoomPosition', () => {
        let globals = {};

        beforeEach(()=>{
            const runtimeData = {
                staticTerrainData: require('../../helpers/mocks/rooms').terrain
            };
            const register = {
                wrapFn: function(fn) { return fn }
            };

            rooms.make(runtimeData, {}, register, globals);
            rooms.makePos(register);
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
    });
});