const utils = require('../../../../../src/utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    build = require('../../../../../src/processor/intents/creeps/build'),
    repair = require('../../../../../src/processor/intents/creeps/repair'),
    upgradeController = require('../../../../../src/processor/intents/creeps/upgradeController');

describe('Creep work intents without energy', () => {
    let creep, bulk, stats, eventLog;

    beforeEach(() => {
        creep = {
            _id: 'creep',
            type: 'creep',
            user: 'user',
            room: 'W0N0',
            x: 10,
            y: 10,
            body: [{type: C.WORK, hits: 100}],
            store: {},
            actionLog: {}
        };
        bulk = jasmine.createSpyObj('bulk', ['update']);
        stats = jasmine.createSpyObj('stats', ['inc']);
        eventLog = [];
    });

    it('ignores build intents', () => {
        const target = {
            _id: 'site',
            type: 'constructionSite',
            structureType: C.STRUCTURE_ROAD,
            room: 'W0N0',
            x: 10,
            y: 11,
            progress: 0,
            progressTotal: 100
        };

        build(creep, {id: target._id}, {
            roomObjects: {[target._id]: target},
            bulk,
            stats,
            eventLog
        });

        expect(target.progress).toBe(0);
        expect(creep.store.energy).toBeUndefined();
        expect(bulk.update).not.toHaveBeenCalled();
        expect(stats.inc).not.toHaveBeenCalled();
        expect(eventLog).toEqual([]);
    });

    it('ignores repair intents', () => {
        const target = {
            _id: 'road',
            type: C.STRUCTURE_ROAD,
            x: 10,
            y: 11,
            hits: 1,
            hitsMax: 100
        };

        repair(creep, {id: target._id}, {
            roomObjects: {[target._id]: target},
            bulk,
            stats,
            eventLog
        });

        expect(target.hits).toBe(1);
        expect(creep.store.energy).toBeUndefined();
        expect(bulk.update).not.toHaveBeenCalled();
        expect(stats.inc).not.toHaveBeenCalled();
        expect(eventLog).toEqual([]);
    });

    it('ignores upgradeController intents', () => {
        const target = {
            _id: 'controller',
            type: C.STRUCTURE_CONTROLLER,
            user: creep.user,
            room: 'W0N0',
            x: 10,
            y: 11,
            level: 1,
            progress: 0,
            downgradeTime: 100000,
            safeModeAvailable: 0,
            effects: []
        };
        const bulkUsers = jasmine.createSpyObj('bulkUsers', ['inc']);

        upgradeController(creep, {id: target._id}, {
            roomObjects: {[target._id]: target},
            bulk,
            bulkUsers,
            stats,
            gameTime: 1,
            eventLog,
            users: {}
        });

        expect(target.progress).toBe(0);
        expect(creep.store.energy).toBeUndefined();
        expect(bulk.update).not.toHaveBeenCalled();
        expect(bulkUsers.inc).not.toHaveBeenCalled();
        expect(stats.inc).not.toHaveBeenCalled();
        expect(eventLog).toEqual([]);
    });
});
