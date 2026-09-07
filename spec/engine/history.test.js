const {describe, it, beforeEach, afterEach, mock} = require('node:test'),
    assert = require('node:assert/strict'),
    {isDeepStrictEqual} = require('node:util'),
    q = require('q'),
    utils = require('../../src/utils'),
    driver = utils.getDriver(),
    history = require('../../src/history');

function calledWith(fn, expected) {
    return fn.mock.calls.some(call => isDeepStrictEqual(call.arguments, expected));
}

describe('history', () => {
    const originalHistory = driver.history;
    const originalConfig = driver.config;
    const originalGetActiveRooms = driver.getActiveRooms;
    const originalGetRoomObjects = driver.getRoomObjects;

    beforeEach(() => {
        driver.config = Object.assign({}, driver.config, {historyChunkSize: 20});
        driver.history = {
            saveTick: mock.fn(() => q.when()),
            upload: mock.fn(() => q.when()),
            markPendingHistory: mock.fn(() => q.when()),
            takePendingHistory: mock.fn(() => q.when([]))
        };
        driver.getActiveRooms = mock.fn(() => q.when([]));
        driver.getRoomObjects = mock.fn(() => q.when({objects: {}}));
    });

    afterEach(() => {
        driver.history = originalHistory;
        driver.config = originalConfig;
        driver.getActiveRooms = originalGetActiveRooms;
        driver.getRoomObjects = originalGetRoomObjects;
    });

    describe('buildHistoryPayload', () => {
        it('skips flags and strips private say', () => {
            const payload = history.buildHistoryPayload({
                a: {_id: 'a', type: 'source'},
                b: {_id: 'b', type: 'flag'},
                c: {
                    _id: 'c',
                    type: 'creep',
                    actionLog: {say: {message: 'hi', isPublic: false}}
                }
            });

            assert.deepStrictEqual(payload.a, {_id: 'a', type: 'source'});
            assert.strictEqual(payload.b, undefined);
            assert.strictEqual(payload.c._id, 'c');
            assert.strictEqual(payload.c.actionLog.say, undefined);
        });
    });

    describe('saveRoomHistory', () => {
        it('does not upload mid-chunk', () => {
            return history.saveRoomHistory('W1N1', {a: 1}, 10).then(() => {
                assert.strictEqual(driver.history.upload.mock.callCount(), 0);
                assert.ok(calledWith(driver.history.saveTick, ['W1N1', 10, JSON.stringify({a: 1})]));
                assert.ok(calledWith(driver.history.markPendingHistory, ['W1N1', 0]));
            });
        });

        it('uploads the previous chunk on a boundary then saveTicks the new chunk', () => {
            return history.saveRoomHistory('W1N1', {a: 1}, 20).then(() => {
                assert.ok(calledWith(driver.history.upload, ['W1N1', 0]));
                assert.ok(calledWith(driver.history.saveTick, ['W1N1', 20, JSON.stringify({a: 1})]));
                assert.ok(calledWith(driver.history.markPendingHistory, ['W1N1', 20]));
                assert.strictEqual(driver.history.upload.mock.callCount(), 1);
            });
        });
    });

    describe('uploadPendingChunks', () => {
        it('does not flush while the chunk can still receive ticks', () => {
            return history.uploadPendingChunks(20).then(() => {
                assert.strictEqual(driver.history.takePendingHistory.mock.callCount(), 0);
                assert.strictEqual(driver.history.upload.mock.callCount(), 0);
            });
        });

        it('uploads leftover rooms after active rooms have closed the chunk', () => {
            driver.history.takePendingHistory = mock.fn(() => q.when(['W1N1', 'W2N2', 'W3N3']));
            return history.uploadPendingChunks(21, ['W1N1']).then(() => {
                assert.ok(calledWith(driver.history.takePendingHistory, [0]));
                assert.ok(!calledWith(driver.history.upload, ['W1N1', 0]));
                assert.ok(calledWith(driver.history.upload, ['W2N2', 0]));
                assert.ok(calledWith(driver.history.upload, ['W3N3', 0]));
            });
        });
    });

    describe('saveDeactivatedRoomsHistory', () => {
        it('saves the last tick for rooms that will not run next tick', () => {
            driver.getActiveRooms = mock.fn(() => q.when(['W1N1']));
            driver.getRoomObjects = mock.fn(roomId => q.when({
                objects: {src: {_id: 'src', type: 'source', room: roomId}}
            }));
            return history.saveDeactivatedRoomsHistory(['W1N1', 'W2N2'], 10).then(() => {
                assert.ok(calledWith(driver.getRoomObjects, ['W2N2']));
                assert.ok(!calledWith(driver.getRoomObjects, ['W1N1']));
                assert.ok(calledWith(driver.history.saveTick, [
                    'W2N2', 10, JSON.stringify({src: {_id: 'src', type: 'source', room: 'W2N2'}})
                ]));
                assert.strictEqual(driver.history.upload.mock.callCount(), 0);
            });
        });

        it('closes the previous chunk when the last tick is a boundary', () => {
            driver.getActiveRooms = mock.fn(() => q.when([]));
            driver.getRoomObjects = mock.fn(() => q.when({objects: {}}));
            return history.saveDeactivatedRoomsHistory(['W2N2'], 20).then(() => {
                assert.ok(calledWith(driver.history.upload, ['W2N2', 0]));
                assert.ok(calledWith(driver.history.saveTick, ['W2N2', 20, JSON.stringify({})]));
            });
        });
    });
});
