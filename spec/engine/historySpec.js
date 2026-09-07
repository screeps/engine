const q = require('q'),
    utils = require('../../src/utils'),
    driver = utils.getDriver(),
    history = require('../../src/history');

describe('history', () => {
    const originalHistory = driver.history;
    const originalChunkSize = driver.config.historyChunkSize;
    const originalGetActiveRooms = driver.getActiveRooms;
    const originalGetRoomObjects = driver.getRoomObjects;

    beforeEach(() => {
        driver.config.historyChunkSize = 20;
        driver.history = {
            saveTick: jasmine.createSpy('saveTick').and.callFake(() => q.when()),
            upload: jasmine.createSpy('upload').and.callFake(() => q.when()),
            markPendingHistory: jasmine.createSpy('markPendingHistory').and.callFake(() => q.when()),
            takePendingHistory: jasmine.createSpy('takePendingHistory').and.callFake(() => q.when([]))
        };
        driver.getActiveRooms = jasmine.createSpy('getActiveRooms').and.callFake(() => q.when([]));
        driver.getRoomObjects = jasmine.createSpy('getRoomObjects').and.callFake(() => q.when({objects: {}}));
    });

    afterEach(() => {
        driver.history = originalHistory;
        driver.config.historyChunkSize = originalChunkSize;
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

            expect(payload.a).toEqual({_id: 'a', type: 'source'});
            expect(payload.b).toBeUndefined();
            expect(payload.c._id).toBe('c');
            expect(payload.c.actionLog.say).toBeUndefined();
        });
    });

    describe('saveRoomHistory', () => {
        it('does not upload mid-chunk', () => {
            return history.saveRoomHistory('W1N1', {a: 1}, 10).then(() => {
                expect(driver.history.upload).not.toHaveBeenCalled();
                expect(driver.history.saveTick).toHaveBeenCalledWith('W1N1', 10, JSON.stringify({a: 1}));
                expect(driver.history.markPendingHistory).toHaveBeenCalledWith('W1N1', 0);
            });
        });

        it('uploads the previous chunk on a boundary then saveTicks the new chunk', () => {
            return history.saveRoomHistory('W1N1', {a: 1}, 20).then(() => {
                expect(driver.history.upload).toHaveBeenCalledWith('W1N1', 0);
                expect(driver.history.saveTick).toHaveBeenCalledWith('W1N1', 20, JSON.stringify({a: 1}));
                expect(driver.history.markPendingHistory).toHaveBeenCalledWith('W1N1', 20);
                expect(driver.history.upload.calls.count()).toBe(1);
            });
        });
    });

    describe('uploadPendingChunks', () => {
        it('does not flush while the chunk can still receive ticks', () => {
            return history.uploadPendingChunks(20).then(() => {
                expect(driver.history.takePendingHistory).not.toHaveBeenCalled();
                expect(driver.history.upload).not.toHaveBeenCalled();
            });
        });

        it('uploads leftover rooms after active rooms have closed the chunk', () => {
            driver.history.takePendingHistory.and.callFake(() => q.when(['W1N1', 'W2N2', 'W3N3']));
            return history.uploadPendingChunks(21, ['W1N1']).then(() => {
                expect(driver.history.takePendingHistory).toHaveBeenCalledWith(0);
                expect(driver.history.upload).not.toHaveBeenCalledWith('W1N1', 0);
                expect(driver.history.upload).toHaveBeenCalledWith('W2N2', 0);
                expect(driver.history.upload).toHaveBeenCalledWith('W3N3', 0);
            });
        });
    });

    describe('saveDeactivatedRoomsHistory', () => {
        it('saves the last tick for rooms that will not run next tick', () => {
            driver.getActiveRooms.and.callFake(() => q.when(['W1N1']));
            driver.getRoomObjects.and.callFake(roomId => q.when({
                objects: {src: {_id: 'src', type: 'source', room: roomId}}
            }));
            return history.saveDeactivatedRoomsHistory(['W1N1', 'W2N2'], 10).then(() => {
                expect(driver.getRoomObjects).toHaveBeenCalledWith('W2N2');
                expect(driver.getRoomObjects).not.toHaveBeenCalledWith('W1N1');
                expect(driver.history.saveTick).toHaveBeenCalledWith(
                    'W2N2', 10, JSON.stringify({src: {_id: 'src', type: 'source', room: 'W2N2'}}));
                expect(driver.history.upload).not.toHaveBeenCalled();
            });
        });

        it('closes the previous chunk when the last tick is a boundary', () => {
            driver.getActiveRooms.and.callFake(() => q.when([]));
            driver.getRoomObjects.and.callFake(() => q.when({objects: {}}));
            return history.saveDeactivatedRoomsHistory(['W2N2'], 20).then(() => {
                expect(driver.history.upload).toHaveBeenCalledWith('W2N2', 0);
                expect(driver.history.saveTick).toHaveBeenCalledWith('W2N2', 20, JSON.stringify({}));
            });
        });
    });
});
