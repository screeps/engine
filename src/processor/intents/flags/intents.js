var _ = require('lodash');

module.exports = function(object, objectIntents, roomObjects, roomTerrain, bulk, bulkUsers, roomController, stats) {

    if(objectIntents.remove) {
        bulk.remove(object._id);
    }

    if(objectIntents.setColor) {
        if(_.includes(['white','grey','red','purple','blue','cyan','green','yellow','orange','brown'], objectIntents.setColor.color) &&
           _.includes(['white','grey','red','purple','blue','cyan','green','yellow','orange','brown'], objectIntents.setColor.secondaryColor)) {
            bulk.update(object, {color: objectIntents.setColor.color, secondaryColor: objectIntents.setColor.secondaryColor});
        }
    }

    if(objectIntents.setPosition) {
        var intent = objectIntents.setPosition;
        if(intent.x >= 0 && intent.y >= 0 && intent.x <= 49 && intent.y <= 49 && /^(W|E)\d+(S|N)\d+$/.test(intent.roomName)) {
            bulk.update(object, {x: intent.x, y: intent.y, room: intent.roomName});
        }
    }

};