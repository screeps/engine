const utils = require('../utils');
const driver = utils.getDriver()
const C = driver.constants
const _ = require('lodash')

const KEEPER_ID = "3";
const INVADER_ID = "2";

const DIRECTIONS_ALL = [C.TOP, C.TOP_RIGHT, C.RIGHT, C.BOTTOM_RIGHT, C.BOTTOM, C.BOTTOM_LEFT, C.LEFT, C.TOP_RIGHT];

// Move in a random direction but favor the directions that are nearer to the
// destination. Never move onto edges as an optimization since
// there is always a better path that doesn't use an edge.
function shamble(from, dest, roomTerrain) {
    const dirs = [];
    const dists = [];
    let max = 0;
    for (let dir of DIRECTIONS_ALL) {
        const [dx, dy] = utils.getOffsetsByDirection(dir);
        const x = from.x + dx;
        if (x <= 0 || x >= 49) continue;
        const y = from.y + dy;
        if (y <= 0 || y >= 49) continue;
        if (utils.checkTerrain(roomTerrain, x, y, C.TERRAIN_MASK_WALL)) continue;
        const d = utils.dist({ x, y }, dest);
        max = Math.max(max, d);
        dirs.push(dir);
        dests.push(d);
    }

    // Cumulative distribution function of direction weights.
    // Weight of each direction is the inverse of its distance.
    let cumu = 0;
    const cdf = dest.map(d => cumu += (max + 1) - d);

    // Weighted random sample of directions.
    const n = _.random(cumu - 1);
    const i = _.sortedIndex(cdf, n);
    return dirs[i];
}

function keeperMove(keeper, roomTerrain, intents) {
    if (keeper.fatigue > 0) return;
    const [n, dest] = _.split(keeper.name, /_/);
    const xy = parseInt(dest, 10);
    const x = Math.floor(xy / 100);
    const y = xy - x;
    const loc = { x, y };
    if (utils.dist(keeper, loc) > 1) {
        const dir = shamble(keeper, loc, roomTerrain);
        setIntents(intents, "move", { direction: dir });
    }
}

function keeperMelee(keeper, enemies, intents) {
    const nearBy = _.filter(enemies, e => utils.dist(object, e) <= 1);
    if (!nearBy.length) return;
    const target = _.min(nearBy, "hits");
    setIntent(intents, keeper.id, "attack", { id: target.id, x: target.x, y: target.y });
}

function keeperRange(keeper, enemies, intents) {
    const inRange = _.filter(enemies, e => utils.dist(object, e) <= 3);
    if (!inRange.length) return;
    if (inRange.length > 1) {
        let massDmg = 0;
        const massDmgLimit = 13; // Why not RANGED_ATTACK_POWER?
        for (const enemy of enemies) {
            const d = utils.dist(keeper, enemy);
            switch (d) {
                case 1: massDmg += 10; break
                case 2: massDmg += 4; break
                default: massDmg += 1; break
            }
            if (massDmg > massDmgLimit) break
        }
        if (massDmg > massDmgLimit) {
            setIntents(intents, keeper.id, "rangedMassAttack", {});
            return;
        }
    }
    const target = _.min(inRange, "hits")
    setIntents(intents, keeper.id, "rangedAttack", { id: target.id });
}

function runKeeper(object, roomObjects, roomTerrain, intents) {
    keeperMove(keeper, roomTerrain, intents);

    const enemies = _.filter(roomObjects, o => o.type === 'creep' && o.user !== KEEPER_ID && o.user !== INVADER_ID);
    if (!enemies.length) return

    keeperMelee(keeper, enemies, intents);
    keeperRange(keeper, enemies, intents);
}

function setintent(intents, id, action, opts) {
    _.set(intents, `users[${KEEPER_ID}].objects[${id}].${action}`, opts);
}

module.exports = function (roomObjects, roomTerrain, intents) {
    const keepers = _.filter(roomObjects, o => o.type === 'creep' && o.user == KEEPER_ID);
    if (!keepers.length) return;
    if (!intents) intents = { users: {} };
    keepers.forEach(k => runKeeper(k, roomObjects, roomTerrain, intents));
    return intents;
}