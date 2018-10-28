const _ = require('lodash');

exports.scope = {
    roomObjects: {},
    gameTime: 30,
    bulk: require('./bulk')
};

exports.reset = ()=>{ exports.scope.bulk.reset(); exports.scope.roomObjects = {}};
exports.ticks = ()=> { _(exports.scope.roomObjects).filter({type: 'creep'}).value().map(c=>c.tick()) };
