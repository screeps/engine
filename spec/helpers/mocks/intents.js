const _ = require('lodash');

exports.scope = {
    roomObjects: {},
    gameTime: 30,
    eventLog: [],
    bulk: require('./bulk')
};

exports.reset = ()=>{ exports.scope.bulk.reset(); exports.scope.roomObjects = {}};
exports.ticks = ()=> {
    _.forEach(exports.scope.roomObjects, (object => {
        if(object.type == 'creep' || object.type == 'powerCreep') {
            object.tick();
        }
    }));
};
