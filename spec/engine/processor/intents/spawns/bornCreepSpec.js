const _ = require('lodash'),
    utils = require('../../../../../src/utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../../../../../src/processor/intents/movement'),
    bornCreep = require('../../../../../src/processor/intents/spawns/_born-creep'),
    roomsEnv = require('../../../../helpers/mocks/rooms'),
    creepsEnv = require('../../../../helpers/mocks/creeps'),
    spawnsEnv = require('../../../../helpers/mocks/spawns'),
    users = require('../../../../helpers/mocks/users'),
    intents = require('../../../../helpers/mocks/intents'),
    common = require('../../../../helpers/mocks/common');

const OWNER = users.defaultId;
const HOSTILE = 'hostile-user-id';
const SPAWN_X = 16;
const SPAWN_Y = 1;

function neighbor(direction) {
    const [dx, dy] = utils.getOffsetsByDirection(direction);
    return { x: SPAWN_X + dx, y: SPAWN_Y + dy };
}

function createSpawningCreep(spawn, data) {
    return creepsEnv.createCreep('scout', _.merge({
        name: 'newborn',
        user: spawn.user,
        x: spawn.x,
        y: spawn.y,
        spawning: true
    }, data));
}

function createHostile(direction, data) {
    const pos = neighbor(direction);
    return creepsEnv.createCreep('scout', _.merge({
        name: 'invader',
        user: HOSTILE,
        x: pos.x,
        y: pos.y,
        ageTime: 1000,
        _ticksToLive: 1500,
        store: {}
    }, data));
}

function createFriendly(direction, data) {
    const pos = neighbor(direction);
    return creepsEnv.createCreep('scout', _.merge({
        name: 'blocker',
        user: OWNER,
        x: pos.x,
        y: pos.y
    }, data));
}

function createExtension(direction) {
    const pos = neighbor(direction);
    const extension = {
        _id: common.generateId(),
        type: 'extension',
        room: 'E2S7',
        user: OWNER,
        x: pos.x,
        y: pos.y,
        hits: 1000,
        hitsMax: 1000,
        store: { energy: 0 }
    };
    intents.scope.roomObjects[extension._id] = extension;
    intents.scope.bulk.insert(extension);
    return extension;
}

describe('_born-creep', () => {
    let scope, spawn, spawningCreep;

    beforeEach(() => {
        scope = intents.scope;
        intents.reset();
        scope.gameTime = 100;
        scope.roomTerrain = roomsEnv.terrain.E2S7;
        scope.eventLog = [];
        scope.stats = { inc() {} };
        scope.roomController = {
            type: 'controller',
            user: OWNER,
            level: 8,
            x: 20,
            y: 20,
            safeMode: 0
        };

        spawn = spawnsEnv.createSpawn({
            x: SPAWN_X,
            y: SPAWN_Y,
            user: OWNER,
            spawning: {
                name: 'newborn',
                needTime: 3,
                spawnTime: 103,
                directions: [1, 2, 3, 4, 5, 6, 7, 8]
            }
        });
        spawningCreep = createSpawningCreep(spawn);
        movement.init(scope.roomObjects, scope.roomTerrain);
    });

    it('spawns onto the first open preferred direction', () => {
        const result = bornCreep(spawn, spawningCreep, scope);

        const expected = neighbor(1);
        expect(result).toBe(true);
        expect(spawningCreep.spawning).toBe(false);
        expect(spawningCreep.x).toBe(expected.x);
        expect(spawningCreep.y).toBe(expected.y);
    });

    it('delays birth when friendly creeps block all preferred exits', () => {
        [1, 2, 3, 4, 5, 6, 7, 8].forEach(d => createFriendly(d, { name: 'friend' + d }));
        movement.init(scope.roomObjects, scope.roomTerrain);

        const result = bornCreep(spawn, spawningCreep, scope);

        expect(result).toBe(false);
        expect(spawningCreep.spawning).toBe(true);
        expect(spawningCreep.x).toBe(SPAWN_X);
        expect(spawningCreep.y).toBe(SPAWN_Y);
    });

    it('spawnstomps a hostile creep when fully surrounded', () => {
        const hostiles = [1, 2, 3, 4, 5, 6, 7, 8].map(d =>
            createHostile(d, { name: 'invader' + d }));
        movement.init(scope.roomObjects, scope.roomTerrain);

        const result = bornCreep(spawn, spawningCreep, scope);

        const stomped = hostiles[0];
        expect(result).toBe(true);
        expect(spawningCreep.spawning).toBe(false);
        expect(spawningCreep.x).toBe(stomped.x);
        expect(spawningCreep.y).toBe(stomped.y);
        expect(scope.roomObjects[stomped._id]).toBeUndefined();
    });

    it('does not spawnstomp when a non-preferred direction is open', () => {
        spawn.spawning.directions = [1];
        const hostile = createHostile(1);
        movement.init(scope.roomObjects, scope.roomTerrain);

        const result = bornCreep(spawn, spawningCreep, scope);

        expect(result).toBe(false);
        expect(spawningCreep.spawning).toBe(true);
        expect(scope.roomObjects[hostile._id]).toBe(hostile);
    });

    it('under safemode still treats a hostile creep as a birth obstacle', () => {
        scope.roomController.safeMode = scope.gameTime + 5000;
        const hostile = createHostile(1);
        movement.init(scope.roomObjects, scope.roomTerrain);

        const result = bornCreep(spawn, spawningCreep, scope);

        // dir 1 blocked by hostile → born on dir 2 (would be dir 1 if safemode cleared the obstacle)
        const expected = neighbor(2);
        expect(result).toBe(true);
        expect(spawningCreep.x).toBe(expected.x);
        expect(spawningCreep.y).toBe(expected.y);
        expect(scope.roomObjects[hostile._id]).toBe(hostile);
    });

    it('under safemode still spawnstomps when fully surrounded by hostiles', () => {
        scope.roomController.safeMode = scope.gameTime + 5000;
        const hostiles = [1, 2, 3, 4, 5, 6, 7, 8].map(d =>
            createHostile(d, { name: 'invader' + d }));
        movement.init(scope.roomObjects, scope.roomTerrain);

        const result = bornCreep(spawn, spawningCreep, scope);

        const stomped = hostiles[0];
        expect(result).toBe(true);
        expect(spawningCreep.spawning).toBe(false);
        expect(spawningCreep.x).toBe(stomped.x);
        expect(spawningCreep.y).toBe(stomped.y);
        expect(scope.roomObjects[stomped._id]).toBeUndefined();
    });

    it('under safemode still treats structures as birth obstacles', () => {
        scope.roomController.safeMode = scope.gameTime + 5000;
        spawn.spawning.directions = [1];
        createExtension(1);
        movement.init(scope.roomObjects, scope.roomTerrain);

        const result = bornCreep(spawn, spawningCreep, scope);

        expect(result).toBe(false);
        expect(spawningCreep.spawning).toBe(true);
        expect(spawningCreep.x).toBe(SPAWN_X);
        expect(spawningCreep.y).toBe(SPAWN_Y);
    });
});
