const _ = require('lodash'),
    intents = require('./intents'),
    common = require('./common'),
    users = require('./users');

const commonData = {
    type: 'spawn',
    room: 'E2S7',
    user: users.defaultId,
    name: 'Spawn1',
    store: { energy: 300 },
    storeCapacityResource: { energy: 300 },
    hits: 5000,
    hitsMax: 5000,
    spawning: null,
    toString: function(){ return `[spawn #${this._id}@${this.x},${this.y}]`; }
};

exports.createSpawn = function(data) {
    const copy = _.merge(
        _.cloneDeep(commonData),
        data);
    if(!copy._id) {
        copy._id = common.generateId();
    }
    intents.scope.roomObjects[copy._id] = copy;
    intents.scope.bulk.insert(copy);
    return copy;
};
