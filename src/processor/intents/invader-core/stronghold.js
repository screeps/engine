var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

const ownedStructureTypes = [
    C.STRUCTURE_TOWER,
    C.STRUCTURE_RAMPART
];

const structuresTemplate = {
    0: [],
    1: [
        { type: C.STRUCTURE_RAMPART,    dx:  0, dy: 0  },
        { type: C.STRUCTURE_RAMPART,    dx:  0, dy: 1  },
        { type: C.STRUCTURE_RAMPART,    dx:  1, dy: 0  },
        { type: C.STRUCTURE_RAMPART,    dx:  1, dy: 1  },
        { type: C.STRUCTURE_TOWER,      dx:  1, dy: 1  },
        { type: C.STRUCTURE_CONTAINER,  dx:  1, dy: 0  }
    ],
    2: [
        { type: C.STRUCTURE_RAMPART,    dx: -1, dy: -1 },
        { type: C.STRUCTURE_RAMPART,    dx: -1, dy: 0  },
        { type: C.STRUCTURE_RAMPART,    dx: -1, dy: 1  },
        { type: C.STRUCTURE_RAMPART,    dx:  0, dy: -1 },
        { type: C.STRUCTURE_RAMPART,    dx:  1, dy: -1 },
        { type: C.STRUCTURE_TOWER,      dx: -1, dy: -1 },
        { type: C.STRUCTURE_CONTAINER,  dx: -1, dy: 0  }
    ],
    3: [
        { type: C.STRUCTURE_RAMPART,    dx: -2, dy: -1 },
        { type: C.STRUCTURE_RAMPART,    dx: -2, dy: 0  },
        { type: C.STRUCTURE_RAMPART,    dx: -2, dy: 1  },
        { type: C.STRUCTURE_RAMPART,    dx: -2, dy: 2  },
        { type: C.STRUCTURE_RAMPART,    dx: -1, dy: 2  },
        { type: C.STRUCTURE_RAMPART,    dx:  0, dy: 2  },
        { type: C.STRUCTURE_RAMPART,    dx:  1, dy: 2  },
        { type: C.STRUCTURE_TOWER,      dx: -1, dy: 1  },
        { type: C.STRUCTURE_CONTAINER,  dx:  0, dy: 1  }
    ],
    4: [
        { type: C.STRUCTURE_RAMPART,    dx:  2, dy: -2 },
        { type: C.STRUCTURE_RAMPART,    dx:  2, dy: -1 },
        { type: C.STRUCTURE_RAMPART,    dx:  2, dy: 0  },
        { type: C.STRUCTURE_RAMPART,    dx:  2, dy: 1  },
        { type: C.STRUCTURE_RAMPART,    dx:  2, dy: 2  },
        { type: C.STRUCTURE_RAMPART,    dx:  1, dy: -2 },
        { type: C.STRUCTURE_RAMPART,    dx:  0, dy: -2 },
        { type: C.STRUCTURE_RAMPART,    dx: -1, dy: -2 },
        { type: C.STRUCTURE_RAMPART,    dx: -2, dy: -2 },
        { type: C.STRUCTURE_TOWER,      dx:  1, dy: -1 },
        { type: C.STRUCTURE_CONTAINER,  dx:  0, dy: -1 }
    ],
    5: [
        { type: C.STRUCTURE_RAMPART,    dx: -3, dy: -2 },
        { type: C.STRUCTURE_RAMPART,    dx: -3, dy: -1 },
        { type: C.STRUCTURE_RAMPART,    dx: -3, dy: 0  },
        { type: C.STRUCTURE_RAMPART,    dx: -3, dy: 1  },
        { type: C.STRUCTURE_RAMPART,    dx: -3, dy: 2  },
        { type: C.STRUCTURE_RAMPART,    dx: -2, dy: -3 },
        { type: C.STRUCTURE_RAMPART,    dx: -1, dy: -3 },
        { type: C.STRUCTURE_RAMPART,    dx:  0, dy: -3 },
        { type: C.STRUCTURE_RAMPART,    dx:  1, dy: -3 },
        { type: C.STRUCTURE_RAMPART,    dx:  2, dy: -3 },
        { type: C.STRUCTURE_RAMPART,    dx:  3, dy: -2 },
        { type: C.STRUCTURE_RAMPART,    dx:  3, dy: -1 },
        { type: C.STRUCTURE_RAMPART,    dx:  3, dy: 0  },
        { type: C.STRUCTURE_RAMPART,    dx:  3, dy: 1  },
        { type: C.STRUCTURE_RAMPART,    dx:  3, dy: 2  },
        { type: C.STRUCTURE_RAMPART,    dx: -2, dy: 3  },
        { type: C.STRUCTURE_RAMPART,    dx: -1, dy: 3  },
        { type: C.STRUCTURE_RAMPART,    dx:  0, dy: 3  },
        { type: C.STRUCTURE_RAMPART,    dx:  1, dy: 3  },
        { type: C.STRUCTURE_RAMPART,    dx:  2, dy: 3  },
        { type: C.STRUCTURE_TOWER,      dx:  0, dy: -2 },
        { type: C.STRUCTURE_TOWER,      dx:  0, dy: 2  },
        { type: C.STRUCTURE_CONTAINER,  dx: -2, dy: 0  },
        { type: C.STRUCTURE_CONTAINER,  dx:  2, dy: 0  },
    ]
};

/**
 *
 * @param {number} level stronghold level (0-5)
 * @returns {{resource: string, amount: number}[]}
 */
const generateReward = function(level) {
    const result = [];
    if(C.STRONGHOLD_REWARD_RESOURCE[level]) {
        result.push({
            resource: _.sample(C.STRONGHOLD_REWARD_RESOURCE[level]),
            amount: C.STRONGHOLD_REWARD_AMOUNT[level]
        });
    }
    if(level == 5) {
        result.push({
            resource: _.sample([C.RESOURCE_CATALYZED_GHODIUM_ACID, C.RESOURCE_CATALYZED_GHODIUM_ALKALIDE]),
            amount: C.STRONGHOLD_REWARD_AMOUNT[2]
        });
    }

    return result;
};

const levelAvailable = function(x, y, level, roomTerrain)
{
    if(!structuresTemplate[level]) {
        return false;
    }

    return _.reduce(structuresTemplate[level], (r, s) => r && !utils.checkTerrain(roomTerrain, x+s.dx,y+s.dy, C.TERRAIN_MASK_WALL), true);
};

/**
 * Creates group of structures for the specified level. This
 *
 * @param {number} x X-coord of invaders core
 * @param {number} y Y-coord of invaders core
 * @param {string} room room name where stronghold is
 * @param {number} level stronghold level (0-5)
 * @param {string} user id of user that the stronghold belongs to
 * @param {number} nextDecayTime next tick when the stronghold upgrades itself
 * @returns {Array} Returns the structures for the specified level.
 */
const createStructures = function(x, y, room, level, user, nextDecayTime) {
    if(!structuresTemplate[level]) {
        return null;
    }

    const objectOptions = {};
    objectOptions[C.STRUCTURE_RAMPART] = {
        hits: C.INVADER_CORE_RAMPART_HITS[level],
        hitsMax: C.INVADER_CORE_RAMPART_HITS[level]
    };
    objectOptions[C.STRUCTURE_TOWER] = {
        hits: C.TOWER_HITS,
        hitsMax: C.TOWER_HITS,
        energy: C.TOWER_CAPACITY,
        energyCapacity: C.TOWER_CAPACITY,
        actionLog: {attack: null, heal: null, repair: null}
    };
    objectOptions[C.STRUCTURE_CONTAINER] = {
        notifyWhenAttacked: false,
        hits: C.CONTAINER_HITS,
        hitsMax: C.CONTAINER_HITS
    };
    ownedStructureTypes.forEach(function(t){
        objectOptions[t] = _.merge(objectOptions[t]||{}, {user: user});
    });

    const result =
        _.map(
            structuresTemplate[level],
            i => _.merge(
                {
                    x: 0+x+i.dx,
                    y: 0+y+i.dy,
                    room: ""+room,
                    type: i.type,
                    nextDecayTime
                },
                objectOptions[i.type]||{}));

    const rewards = generateReward(level);
    const containers = _.filter(result, {type: C.STRUCTURE_CONTAINER});
    for(let i = 0; i < containers.length; i++) {
        if(rewards[i]) {
            containers[i][rewards[i].resource] = rewards[i].amount;
            containers[i].energyCapacity = rewards[i].amount;
        } else {
            containers[i].energyCapacity = C.CONTAINER_CAPACITY;
        }
    }

    return result;
};

module.exports = {
    createStructures: createStructures,
    levelAvailable: levelAvailable
};
