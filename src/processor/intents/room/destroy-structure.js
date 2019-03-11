var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(userId, intent, scope) {

    const {roomObjects, bulk, roomController} = scope;

    var object = roomObjects[intent.id];

    if(!object || !C.CONSTRUCTION_COST[object.type]) return;

    if(!roomController || roomController.user != userId) return;

    if(object.type == C.STRUCTURE_WALL && object.decayTime && !object.user) return;

    if(_.any(roomObjects, i => (i.type == 'creep' || i.type == 'powerCreep') && i.user != userId)) return;

    bulk.remove(object._id);

    if(object.type == 'spawn' && object.spawning) {
        var spawning = _.find(roomObjects, {user: object.user, name: object.spawning.name});
        if(spawning) {
            bulk.remove(spawning._id);
        }
    }

    C.RESOURCES_ALL.forEach(resourceType => {
        // drop contents of anything with .energy or .store[]
        if (object[resourceType] > 0) {
            require('../creeps/_create-energy')(object.x, object.y, object.room,
            object[resourceType], resourceType, scope);
        }
        // drop mineral from lab
        if (object.mineralType === resourceType && object.mineralAmount > 0) {
            require('../creeps/_create-energy')(object.x, object.y, object.room,
            object.mineralAmount, resourceType, scope);
        }
    });

    if(object.type == 'constructedWall' && object.decayTime && object.user) {
        require('../creeps/_clear-newbie-walls')(scope);
    }

};