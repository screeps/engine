// Only the game constants exercised by the engine specs. Keep values in sync
// with @screeps/common when extending the specs.
exports.constants = {
    MOVE: 'move',
    WORK: 'work',
    CARRY: 'carry',
    TOUGH: 'tough',
    CLAIM: 'claim',
    CARRY_CAPACITY: 50,
    CREEP_LIFE_TIME: 1500,
    CREEP_CLAIM_LIFE_TIME: 600,
    ROAD_WEAROUT: 1,
    ROAD_WEAROUT_POWER_CREEP: 100,
    TERRAIN_MASK_WALL: 1,
    TERRAIN_MASK_SWAMP: 2,
    RESOURCE_ENERGY: 'energy',
    RESOURCES_ALL: [
        'energy', 'power', 'H', 'O', 'U', 'K', 'L', 'Z', 'X', 'G',
        'OH', 'ZK', 'UL', 'UH', 'UO', 'KH', 'KO', 'LH', 'LO', 'ZH', 'ZO', 'GH', 'GO',
        'UH2O', 'UHO2', 'KH2O', 'KHO2', 'LH2O', 'LHO2', 'ZH2O', 'ZHO2', 'GH2O', 'GHO2',
        'XUH2O', 'XUHO2', 'XKH2O', 'XKHO2', 'XLH2O', 'XLHO2', 'XZH2O', 'XZHO2', 'XGH2O', 'XGHO2',
        'ops', 'silicon', 'metal', 'biomass', 'mist',
        'utrium_bar', 'lemergium_bar', 'zynthium_bar', 'keanium_bar', 'ghodium_melt',
        'oxidant', 'reductant', 'purifier', 'battery', 'composite', 'crystal', 'liquid',
        'wire', 'switch', 'transistor', 'microchip', 'circuit', 'device',
        'cell', 'phlegm', 'tissue', 'muscle', 'organoid', 'organism',
        'alloy', 'tube', 'fixtures', 'frame', 'hydraulics', 'machine',
        'condensate', 'concentrate', 'extract', 'spirit', 'emanation', 'essence'
    ],
    LAB_MINERAL_CAPACITY: 3000,
    EVENT_EXIT: 10,
    EVENT_TRANSFER: 12,
    OBSTACLE_OBJECT_TYPES: [
        'spawn', 'creep', 'powerCreep', 'source', 'mineral', 'deposit',
        'controller', 'constructedWall', 'extension', 'link', 'storage',
        'tower', 'observer', 'powerSpawn', 'powerBank', 'lab', 'terminal',
        'nuker', 'factory', 'invaderCore'
    ],
    BOOSTS: {move: {}, carry: {}}
};

// The storeIntents specs exercise grouping and field filtering, rather than
// the complete set of intent types supported by the production sanitizer.
const intentFields = {
    notify: ['message', 'groupInterval'],
    createPowerCreep: ['name', 'className'],
    renamePowerCreep: ['id', 'name'],
    createConstructionSite: ['roomName', 'x', 'y', 'structureType', 'name'],
    observeRoom: ['roomName'],
    transfer: ['id', 'amount', 'resourceType']
};

function sanitizeUserIntents(input) {
    const result = {};
    for(const name in input) {
        if(!intentFields[name]) continue;
        const sanitize = intent => {
            const fields = {};
            intentFields[name].forEach(field => {
                if(field in intent) fields[field] = intent[field];
            });
            return fields;
        };
        result[name] = Array.isArray(input[name]) ? input[name].map(sanitize) : sanitize(input[name]);
    }
    return result;
}

exports.system = {
    sanitizeUserIntents,
    sanitizeUserRoomIntents(input, result) {
        for(const name in input) {
            if(!intentFields[name]) continue;
            for(const intent of input[name]) {
                const sanitized = sanitizeUserIntents({[name]: intent})[name];
                const room = result[sanitized.roomName] = result[sanitized.roomName] || {};
                const roomIntents = room.room = room.room || {};
                (roomIntents[name] = roomIntents[name] || []).push(sanitized);
            }
        }
    }
};
