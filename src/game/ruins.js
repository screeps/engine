var utils = require('./../utils'),
    rooms = require('./rooms'),
    driver = utils.getRuntimeDriver(),
    C = driver.constants;

var runtimeData, intents, register, globals;

function _storeGetter(o) {
    return new globals.Store(o);
}

exports.make = function(_runtimeData, _intents, _register, _globals) {
    runtimeData = _runtimeData;
    intents = _intents;
    register = _register;
    globals = _globals;

    if(globals.Ruin) {
        return;
    }

    const data = (id) => {
        if(!runtimeData.roomObjects[id]) {
            throw new Error("Could not find an object with ID "+id);
        }
        return runtimeData.roomObjects[id];
    };

    const Ruin = register.wrapFn(function(id) {
        const _data = data(id);
        globals.RoomObject.call(this, _data.x, _data.y, _data.room, _data.effects);
        this.id = id;
    });

    Ruin.prototype = Object.create(globals.RoomObject.prototype);
    Ruin.prototype.constructor = Ruin;

    utils.defineGameObjectProperties(Ruin.prototype, data, {
        structureType: o => o.structureType,
        destroyTime: o => o.destroyTime,
        ticksToDecay: o => o.decayTime - runtimeData.time,
        store: _storeGetter,
        structure: o => {
            if(o.structure.user) {
                const structure = new globals.OwnedStructure();
                Object.defineProperties(structure, {
                    id: { enumerable: true, get() { return o.structure.id; }},
                    hits: { enumerable: true, get() { return o.structure.hits; }},
                    hitsMax: { enumerable: true, get() { return o.structure.hitsMax; }},
                    structureType: { enumerable: true, get() { return o.structure.type }},
                    owner: { enumerable: true, get() { return { username: runtimeData.users[o.structure.user].username } }},
                    my: { enumerable: true, get() { return o.structure.user == runtimeData.user._id }}
                });
                return structure;
            }

            const structure = new globals.Structure();
            Object.defineProperties(structure, {
                id: { enumerable: true, get() { return o.structure.id; }},
                hits: { enumerable: true, get() { return o.structure.hits }},
                hitsMax: { enumerable: true, get() { return o.structure.hitsMax }},
                structureType: { enumerable: true, get() { return o.structure.type }}
            });
            return structure;
        }
    });

    Ruin.prototype.toString = register.wrapFn(function() {
        return `[ruin (${this.structure.structureType}) #${this.id}]`;
    });

    Object.defineProperty(globals, 'Ruin', {enumerable: true, value: Ruin});
};
