const _ = require('lodash'),
    utils = require('../../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    fakeRuntime = require('../../../common/fake-runtime');

module.exports = function(creep, context) {
    const { hostiles, ramparts, intents, scope, roomObjects } = context;

    if(!_.some(hostiles)) {
        return;
    }

    const safeMatrixCallback = function safeMatrixCallback(room) {
        const matrix = new fakeRuntime.CostMatrix();
        for(let i = 0; i < 50; i++)
            for(let j = 0; j < 50; j++)
                matrix.set(i, j, Infinity);

        for(let rampart of ramparts) {
            matrix.set(rampart.x, rampart.y, 1);
        }

        _.forEach(roomObjects, object => {
            if(object.type != 'creep' && _.includes(C.OBSTACLE_OBJECT_TYPES, object.type)) {
                matrix.set(object.x, object.y, Infinity);
            }
        });

        return matrix;
    };

    const target = fakeRuntime.findClosestByPath(creep, hostiles, { costCallback: safeMatrixCallback }, scope);

    if(!target) {
        return;
    }

    if(utils.dist(creep, target) <= 1) {
        intents.set(creep._id, 'attack', {id: target._id, x: target.x, y: target.y});
    } else {
        fakeRuntime.walkTo(creep, target,{ costCallback: safeMatrixCallback }, context);
    }
};
