const utils = require('./../utils'),
    driver = utils.getRuntimeDriver(),
    C = driver.constants;

let runtimeData, intents, register, globals;

exports.make = function(_runtimeData, _intents, _register, _globals) {
    runtimeData = _runtimeData;
    intents = _intents;
    register = _register;
    globals = _globals;

    if(globals.Deposit) {
        return;
    }

    const data = (id) => {
        if(!runtimeData.roomObjects[id]) {
            throw new Error("Could not find an object with ID "+id);
        }
        return runtimeData.roomObjects[id];
    };

    const Deposit = register.wrapFn(function(id) {
        const _data = data(id);
        globals.RoomObject.call(this, _data.x, _data.y, _data.room, _data.effects);
        this.id = id;
    });

    Deposit.prototype = Object.create(globals.RoomObject.prototype);
    Deposit.prototype.constructor = Deposit;

    utils.defineGameObjectProperties(Deposit.prototype, data, {
        depositType: o => o.depositType,
        cooldown: o => o.cooldownTime && o.cooldownTime > runtimeData.time ? o.cooldownTime - runtimeData.time : 0,
        lastCooldown: o => Math.ceil(C.DEPOSIT_EXHAUST_MULTIPLY*Math.pow(o.harvested,C.DEPOSIT_EXHAUST_POW)),
        ticksToDecay: o => o.decayTime ? o.decayTime - runtimeData.time : undefined
    });

    Deposit.prototype.toString = register.wrapFn(function() {
        return `[deposit (${this.depositType}) #${this.id}]`;
    });

    Object.defineProperty(globals, 'Deposit', {enumerable: true, value: Deposit});
};
