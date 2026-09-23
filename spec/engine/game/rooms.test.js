const {describe, it, beforeEach} = require('node:test'),
    assert = require('node:assert/strict'),
    _ = require('lodash'),
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
            assert.notStrictEqual(globals.RoomPosition, undefined);
        });

        it('Preserves coordinates', ()=>{
            const pos = new globals.RoomPosition(11,14,'E2S7');

            assert.notStrictEqual(pos, undefined);
            assert.strictEqual(pos.x, 11);
            assert.strictEqual(pos.y, 14);
            assert.strictEqual(pos.roomName, 'E2S7');
        });

        it('Mutates x properly', ()=>{
            const pos = new globals.RoomPosition(11,14,'E2S7');

            pos.x++;

            assert.notStrictEqual(pos, undefined);
            assert.strictEqual(pos.x, 12);
            assert.strictEqual(pos.y, 14);
            assert.strictEqual(pos.roomName, 'E2S7');
        });

        it('Mutates y properly', ()=>{
            const pos = new globals.RoomPosition(11,14,'E2S7');

            pos.y++;

            assert.notStrictEqual(pos, undefined);
            assert.strictEqual(pos.x, 11);
            assert.strictEqual(pos.y, 15);
            assert.strictEqual(pos.roomName, 'E2S7');
        });
    });
});
