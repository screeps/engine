const _ = require('lodash'),
    utils =  require('../../../src/utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    intents = require('./intents'),
    common = require('./common');

const commonData = {
    type: 'powerCreep',
    class: 'operator',
    room: 'E2S7',
    actionLog: {},
    level: 1,
    powers: {},
    toString: function(){return `[powerCreep #${this._id}@${this.x},${this.y}]`},
    move: function(target) { require('../../../src/processor/intents/power-creeps/move')(this, _.isNumber(target) ? {direction: target} : {id: target}, intents.scope); },
    tick: function() { require('../../../src/processor/intents/power-creeps/tick')(this, intents.scope); }
};

const powerCreeps = {
    FullOperator: {
        name: 'FullOperator',
        level: 25,
        powers: {1: {level: 5}, 2: {level: 5},4: {level: 1},7: {level: 1}, 13: {level: 4}, 17: {level: 5}},
        hits: 26000,
        hitsMax: 26000,
    }
};

exports.createPowerCreep = function(template, data) {
    const copy = _.merge(
        _.cloneDeep(commonData),
        _.cloneDeep(powerCreeps[template]),
        data);
    if(!copy._id) {
        copy._id = common.generateId();
    }
    intents.scope.roomObjects[copy._id] = copy;
    intents.scope.bulk.insert(copy);
    return copy;
};
