const _ = require('lodash');
const { inRangeTo, getRangeTo, isNearTo, getDirectionByPath } = require('./utils');

module.exports = function(userId, { intents, roomObjects, users, roomTerrain, gameTime, findPath }) {
    const myCreeps = _.filter(roomObjects, { type: 'creep', user: userId });
    const hostileCreeps = _.filter(roomObjects, ({ type, user }) => type === 'creep' && user !== userId);

    for (const i in myCreeps) {
        const creep = myCreeps[i];

        if (!creep.npc) { // @todo use a different property name - memory?
            creep.npc = {};
            // @todo store this property in the database
        }

        if (!creep.npc.target) {
            const targets = _.filter(roomObjects, ({ type }) => type === 'source' || type === 'mineral');
            creep.npc.target = _.find(targets, inRangeTo(creep.x, creep.y, 5))._id;
        }
        const target = roomObjects[creep.npc.target];

        if (target) {
            if (!isNearTo(creep, target)) {
                if (!creep.npc.path) {
                    creep.npc.path = findPath(creep.x, creep.y, target.x, target.y);
                }

                const path = creep.npc.path;

                const direction = getDirectionByPath(creep, path);

                intents.set(creep._id, 'move', { direction });
            }
        }

        const enemies = _.filter(hostileCreeps, ({ user }) => users[user].username !== 'Invader');

        const meleeEnemies = _.filter(enemies, inRangeTo(creep.x, creep.y, 1));
        if (meleeEnemies.length) {
            const enemy = _.min(meleeEnemies, 'hits');
            intents.set(creep._id, 'attack', { id: enemy._id, x: enemy.x, y: enemy.y });
        }

        const rangedEnemies = _.filter(enemies, inRangeTo(creep.x, creep.y, 3));
        if (rangedEnemies.length) {
            const distanceDamage = {
                1: 10,
                2: 4,
                3: 1,
            };
            const massDamage = _.sum(rangedEnemies, (enemy) => distanceDamage[getRangeTo(creep, enemy)]);
            if (massDamage > 13) {
                intents.set(creep._id, 'rangedMassAttack', {});
            } else {
                const enemy = _.min(rangedEnemies, 'hits');
                intents.set(creep._id, 'rangedAttack', { id: enemy._id });
            }
        }
    }
};
