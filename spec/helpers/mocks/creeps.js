const _ = require('lodash'),
    utils =  require('../../../src/utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    intents = require('./intents'),
    common = require('./common');

const commonData = {
    type: 'creep',
    room: 'E2S7',
    fatigue: 0,
    actionLog: {},
    toString: function(){return `[creep #${this._id}@${this.x},${this.y}]`},
    move: function(target) { require('../../../src/processor/intents/creeps/move')(this, _.isNumber(target) ? {direction: target} : {id: target}, intents.scope); },
    pull: function(target) { require('../../../src/processor/intents/creeps/pull')(this, {id: target}, intents.scope); },
    tick: function() { require('../../../src/processor/intents/creeps/tick')(this, intents.scope); }
};

const creeps = {
    scout: {
        name: 'scout',
        body: [
            {type: C.MOVE, hits: 100}
        ]
    },
    noMove: {
        name: 'noMove',
        body: [
            {type: C.TOUGH, hits: 100}
        ]
    },
    fullSpeed: {
        name: 'fullSpeed',
        body: [
            {type: C.TOUGH, hits: 100},
            {type: C.MOVE, hits: 100}
        ]
    },
    halfSpeed: {
        name: 'halfSpeed',
        body: [
            {type: C.TOUGH, hits: 100},
            {type: C.TOUGH, hits: 100},
            {type: C.MOVE, hits: 100}
        ]
    },
    halfLocomotive: {
        name: 'halfLocomotive',
        body: _.times(25, _.constant({ type: C.MOVE, hits: 100 }))
    },
    fullLocomotive: {
        name: 'fullLocomotive',
        body: _.times(50, _.constant({ type: C.MOVE, hits: 100 }))
    },
    fullWorker: {
        name: 'fullLocomotive',
        body: _.times(50, _.constant({ type: C.WORK, hits: 100 }))
    },
};

exports.createCreep = function(template, data) {
    const copy = _.merge(
        _.cloneDeep(commonData),
        _.cloneDeep(creeps[template]),
        data);
    if(!copy._id) {
        copy._id = common.generateId();
    }
    intents.scope.roomObjects[copy._id] = copy;
    intents.scope.bulk.insert(copy);
    return copy;
};
