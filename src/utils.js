var _ = require('lodash');

var driver, C, offsetsByDirection;

exports.getDriver = function getDriver() {
    driver = typeof process != 'undefined' && process.env.DRIVER_MODULE ?
        require(process.env.DRIVER_MODULE) :
        require('./core/index');
    C = driver.constants;
    offsetsByDirection = {
        [C.TOP]: [0,-1],
        [C.TOP_RIGHT]: [1,-1],
        [C.RIGHT]: [1,0],
        [C.BOTTOM_RIGHT]: [1,1],
        [C.BOTTOM]: [0,1],
        [C.BOTTOM_LEFT]: [-1,1],
        [C.LEFT]: [-1,0],
        [C.TOP_LEFT]: [-1,-1]
    };
    return driver;
};

exports.fetchXYArguments = function(firstArg, secondArg, globals) {
    var x,y, roomName;
    if(_.isUndefined(secondArg) || !_.isNumber(secondArg)) {
        if(!_.isObject(firstArg)) {
            return [undefined,undefined,undefined];
        }

        if(firstArg instanceof globals.RoomPosition) {
            x = firstArg.x;
            y = firstArg.y;
            roomName = firstArg.roomName;
        }
        if(firstArg.pos && (firstArg.pos instanceof globals.RoomPosition)) {
            x = firstArg.pos.x;
            y = firstArg.pos.y;
            roomName = firstArg.pos.roomName;
        }
    }
    else {
        x = firstArg;
        y = secondArg;
    }
    if(_.isNaN(x)) {
        x = undefined;
    }
    if(_.isNaN(y)) {
        y = undefined;
    }
    return [x,y,roomName];
};

exports.getDirection = function(dx, dy) {

    var adx = Math.abs(dx), ady = Math.abs(dy);

    if(adx > ady*2) {
        if(dx > 0) {
            return C.RIGHT;
        }
        else {
            return C.LEFT;
        }
    }
    else if(ady > adx*2) {
        if(dy > 0) {
            return C.BOTTOM;
        }
        else {
            return C.TOP;
        }
    }
    else {
        if(dx > 0 && dy > 0) {
            return C.BOTTOM_RIGHT;
        }
        if(dx > 0 && dy < 0) {
            return C.TOP_RIGHT;
        }
        if(dx < 0 && dy > 0) {
            return C.BOTTOM_LEFT;
        }
        if(dx < 0 && dy < 0) {
            return C.TOP_LEFT;
        }
    }
};

exports.getOffsetsByDirection = function(direction) {
    if(!offsetsByDirection[direction]) {
        try {
            throw new Error();
        }
        catch(e) {
            console.error('Wrong move direction',JSON.stringify(direction), JSON.stringify(offsetsByDirection), e.stack);
        }

    }
    return offsetsByDirection[direction];
};

exports.calcCreepCost = function(body) {
    var result = 0;

    body.forEach((i) => {
        if(_.isObject(i)) {
            result += C.BODYPART_COST[i.type];
        }
        else {
            result += C.BODYPART_COST[i];
        }
    });

    return result;
};

exports.checkConstructionSite = function(objects, structureType, x, y) {

    var borderTiles;
    if(structureType != 'road' && (x == 1 || x == 48 || y == 1 || y == 48)) {
        if(x == 1) borderTiles = [[0,y-1],[0,y],[0,y+1]];
        if(x == 48) borderTiles = [[49,y-1],[49,y],[49,y+1]];
        if(y == 1) borderTiles = [[x-1,0],[x,0],[x+1,0]];
        if(y == 48) borderTiles = [[x-1,49],[x,49],[x+1,49]];
    }

    if(_.isString(objects) || objects instanceof Uint8Array) {
        if(borderTiles) {
            for(var i in borderTiles) {
                if(!exports.checkTerrain(objects, borderTiles[i][0], borderTiles[i][1], C.TERRAIN_MASK_WALL)) {
                    return false;
                }
            }
        }
        if(structureType == 'extractor') {
            return true;
        }
        if(exports.checkTerrain(objects, x, y, C.TERRAIN_MASK_WALL)) {
            return false;
        }
        return true;
    }

    if(objects && _.isArray(objects[0]) && _.isString(objects[0][0])) {
        if(borderTiles) {
            for(var i in borderTiles) {
                if(!(objects[borderTiles[i][1]][borderTiles[i][0]] & C.TERRAIN_MASK_WALL)) {
                    return false;
                }
            }
        }
        if(structureType == 'extractor') {
            return true;
        }
        if(objects[y][x] & C.TERRAIN_MASK_WALL) {
            return false;
        }
        return true;
    }

    if(_.any(objects, {x, y, type: structureType})) {
        return false;
    }
    if(_.any(objects, {x, y, type: 'constructionSite'})) {
        return false;
    }
    if(structureType == 'extractor') {
        return _.any(objects, {x, y, type: 'mineral'}) && !_.any(objects, {x, y, type: 'extractor'});
    }
    if(structureType != 'rampart' && structureType != 'road' &&
        _.any(objects, (i) => i.x == x && i.y == y && i.type != 'rampart' && i.type != 'road' && C.CONSTRUCTION_COST[i.type])) {
        return false;
    }
    if(x <= 0 || y <= 0 || x >= 49 || y >= 49) {
        return false;
    }
    return true;
};

exports.getDiff = function(oldData, newData) {

    function getIndex(data) {
        var index = {};
        _.forEach(data, (obj) => index[obj._id] = obj);
        return index;
    }


    var result = {},
        oldIndex = getIndex(oldData),
        newIndex = getIndex(newData);

    _.forEach(oldData, (obj) => {
        if(newIndex[obj._id]) {
            var newObj = newIndex[obj._id];
            var objDiff = result[obj._id] = {};
            for(var key in obj) {
                if(key == '_id') {
                    continue;
                }
                if(_.isUndefined(newObj[key])) {
                    objDiff[key] = null;
                }
                else if((typeof obj[key]) != (typeof newObj[key]) || obj[key] && !newObj[key]) {
                    objDiff[key] = newObj[key];
                }
                else if(_.isObject(obj[key])) {
                    objDiff[key] = {};

                    for (var subkey in obj[key]) {
                        if (!_.isEqual(obj[key][subkey], newObj[key][subkey])) {
                            objDiff[key][subkey] = newObj[key][subkey];
                        }
                    }
                    for (var subkey in newObj[key]) {
                        if (_.isUndefined(obj[key][subkey])) {
                            objDiff[key][subkey] = newObj[key][subkey];
                        }
                    }
                    if (!_.size(objDiff[key])) {
                        delete result[obj._id][key];
                    }
                }
                else if(!_.isEqual(obj[key], newObj[key])) {
                    objDiff[key] = newObj[key];
                }
            }
            for(var key in newObj) {
                if(_.isUndefined(obj[key])) {
                    objDiff[key] = newObj[key];
                }
            }
            if(!_.size(objDiff)) {
                delete result[obj._id];
            }
        }
        else {
            result[obj._id] = null;
        }
    });

    _.forEach(newData, (obj) => {
        if(!oldIndex[obj._id]) {
            result[obj._id] = obj;
        }
    });

    return result;
};

exports.encodeTerrain = function(terrain) {
    var result = '';
    for(var y=0; y<50; y++) {
        for(var x=0; x<50; x++) {
            var objects = _.filter(terrain, {x,y}),
                code = 0;
            if(_.any(objects, {type: 'wall'})) {
                code = code | C.TERRAIN_MASK_WALL;
            }
            if(_.any(objects, {type: 'swamp'})) {
                code = code | C.TERRAIN_MASK_SWAMP;
            }
            result = result + code;
        }
    }
    return result;
};

exports.decodeTerrain = function(items) {
    var result = [];

    for(var i in items) {
        if(items[i].type != 'terrain') {
            continue;
        }

        for (var y = 0; y < 50; y++) {
            for (var x = 0; x < 50; x++) {
                var code = items[i].terrain.charAt(y * 50 + x);
                if (code & C.TERRAIN_MASK_WALL) {
                    result.push({room: items[i].room, x, y, type: 'wall'});
                }
                if (code & C.TERRAIN_MASK_SWAMP) {
                    result.push({room: items[i].room, x, y, type: 'swamp'});
                }
            }
        }
    }

    return result;
};

exports.decodeTerrainByRoom = function(items) {
    var result = {
        spatial: {}
    };

    for(var i in items) {
        if(items[i].type != 'terrain') {
            continue;
        }
        result[items[i].room] = result[items[i].room] || [];
        result.spatial[items[i].room] = new Array(50);
        for (var y = 0; y < 50; y++) {
            result.spatial[items[i].room][y] = new Array(50);
            for (var x = 0; x < 50; x++) {
                var code = items[i].terrain.charAt(y * 50 + x);
                /*if (code & C.TERRAIN_MASK_WALL) {
                    result[items[i].room].push({x, y, type: 'wall'});
                }
                if (code & C.TERRAIN_MASK_SWAMP) {
                    result[items[i].room].push({x, y, type: 'swamp'});
                }*/
                result.spatial[items[i].room][y][x] = code;
            }
        }
    }

    return result;
};

exports.checkTerrain = function(terrain, x, y, mask) {
    var code = terrain instanceof Uint8Array ? terrain[y*50+x] : Number(terrain.charAt(y*50 + x));
    return (code & mask) > 0;
};

exports.checkControllerAvailability = function(type, roomObjects, roomController, offset) {
    var rcl = 0;

    if(_.isObject(roomController) && roomController.level && (roomController.user || roomController.owner)) {
        rcl = roomController.level;
    }
    if(_.isNumber(roomController)) {
        rcl = roomController;
    }

    offset = offset || 0;

    var structuresCnt = _(roomObjects).filter((i) => i.type == type || i.type == 'constructionSite' && i.structureType == type).size();
    var availableCnt = C.CONTROLLER_STRUCTURES[type][rcl] + offset;

    return structuresCnt < availableCnt;
};

exports.getRoomNameFromXY = function(x,y) {
    if(x < 0) {
        x = 'W'+(-x-1);
    }
    else {
        x = 'E'+(x);
    }
    if(y < 0) {
        y = 'N'+(-y-1);
    }
    else {
        y = 'S'+(y);
    }
    return ""+x+y;
};

exports.roomNameToXY = function(name) {

    name = name.toUpperCase();

    var match = name.match(/^(\w)(\d+)(\w)(\d+)$/);
    if(!match) {
        return [undefined, undefined];
    }
    var [,hor,x,ver,y] = match;

    if(hor == 'W') {
        x = -x-1;
    }
    else {
        x = +x;
    }
    if(ver == 'N') {
        y = -y-1;
    }
    else {
        y = +y;
    }
    return [x,y];
};

exports.comparatorDistance = function(target) {
    if(target.pos) target = target.pos;
    return function(a,b) {
        if(a.pos) a = a.pos;
        if(b.pos) b = b.pos;
        var da = Math.max(Math.abs(a.x - target.x), Math.abs(a.y - target.y));
        var db = Math.max(Math.abs(b.x - target.x), Math.abs(b.y - target.y));
        return da - db;
    }
};

exports.storeIntents = function(userId, userIntents, userRuntimeData) {
    var intents = {};
    var driver = exports.getDriver();

    for(var i in userIntents) {

        if(i == 'notify') {
            intents.notify = [];
            if(_.isArray(userIntents.notify)) {
                userIntents.notify.forEach((notifyItem) => {
                    intents.notify.push({
                        message: (""+notifyItem.message).substring(0,1000),
                        groupInterval: +notifyItem.groupInterval
                    })
                })
            }
            continue;
        }

        if(i == 'room') {
            var roomIntentsResult = userIntents.room;

            if(roomIntentsResult.createFlag) {
                _.forEach(roomIntentsResult.createFlag, (iCreateFlag) => {

                    intents[iCreateFlag.roomName] =
                    intents[iCreateFlag.roomName] || {};

                    var roomIntents = intents[iCreateFlag.roomName].room =
                    intents[iCreateFlag.roomName].room || {};

                    roomIntents.createFlag = roomIntents.createFlag || [];

                    roomIntents.createFlag.push({
                        x: parseInt(iCreateFlag.x),
                        y: parseInt(iCreateFlag.y),
                        name: ""+iCreateFlag.name,
                        color: +iCreateFlag.color,
                        secondaryColor: +iCreateFlag.secondaryColor,
                        roomName: iCreateFlag.roomName,
                        user: userId
                    })
                });
            }
            if(roomIntentsResult.createConstructionSite) {
                _.forEach(roomIntentsResult.createConstructionSite, (iCreateConstructionSite) => {

                    intents[iCreateConstructionSite.roomName] =
                    intents[iCreateConstructionSite.roomName] || {};

                    var roomIntents = intents[iCreateConstructionSite.roomName].room =
                    intents[iCreateConstructionSite.roomName].room || {};

                    roomIntents.createConstructionSite = roomIntents.createConstructionSite || [];

                    roomIntents.createConstructionSite.push({
                        x: parseInt(iCreateConstructionSite.x),
                        y: parseInt(iCreateConstructionSite.y),
                        structureType: ""+iCreateConstructionSite.structureType,
                        name: ""+iCreateConstructionSite.name,
                        roomName: ""+iCreateConstructionSite.roomName,
                        user: userId
                    });
                });
            }
            if(roomIntentsResult.destroyStructure) {
                _.forEach(roomIntentsResult.destroyStructure, (iDestroyStructure) => {

                    intents[iDestroyStructure.roomName] =
                    intents[iDestroyStructure.roomName] || {};

                    var roomIntents = intents[iDestroyStructure.roomName].room =
                    intents[iDestroyStructure.roomName].room || {};

                    roomIntents.destroyStructure = roomIntents.destroyStructure || [];

                    roomIntents.destroyStructure.push({
                        roomName: ""+iDestroyStructure.roomName,
                        id: ""+iDestroyStructure.id,
                        user: userId
                    });
                });
            }

            if(roomIntentsResult.removeFlag) {
                _.forEach(roomIntentsResult.removeFlag, (iRemoveFlag) => {

                    intents[iRemoveFlag.roomName] =
                    intents[iRemoveFlag.roomName] || {};

                    var roomIntents = intents[iRemoveFlag.roomName].room =
                        intents[iRemoveFlag.roomName].room || {};

                    roomIntents.removeFlag = roomIntents.removeFlag || [];

                    roomIntents.removeFlag.push({
                        roomName: ""+iRemoveFlag.roomName,
                        name: ""+iRemoveFlag.name,
                        user: userId
                    });
                });
            }

            continue;
        }

        if(i == 'market') {
            var marketIntentsResult = userIntents.market;

            if(marketIntentsResult.createOrder) {
                _.forEach(marketIntentsResult.createOrder, (iCreateOrder) => {
                    intents.market = intents.market || {};
                    intents.market.createOrder = intents.market.createOrder || [];
                    intents.market.createOrder.push({
                        type: ""+iCreateOrder.type,
                        resourceType: ""+iCreateOrder.resourceType,
                        price: exports.roundCredits3(iCreateOrder.price),
                        totalAmount: parseInt(iCreateOrder.totalAmount),
                        roomName: iCreateOrder.roomName ? ""+iCreateOrder.roomName : undefined
                    })
                });
            }
            if(marketIntentsResult.cancelOrder) {
                _.forEach(marketIntentsResult.cancelOrder, (iCancelOrder) => {
                    intents.market = intents.market || {};
                    intents.market.cancelOrder = intents.market.cancelOrder || [];
                    intents.market.cancelOrder.push({orderId: ""+iCancelOrder.orderId});
                });
            }
            if(marketIntentsResult.changeOrderPrice) {
                _.forEach(marketIntentsResult.changeOrderPrice, (iChangeOrderPrice) => {
                    intents.market = intents.market || {};
                    intents.market.changeOrderPrice = intents.market.changeOrderPrice || [];
                    intents.market.changeOrderPrice.push({
                        orderId: ""+iChangeOrderPrice.orderId,
                        newPrice: exports.roundCredits3(iChangeOrderPrice.newPrice),
                    });
                });
            }
            if(marketIntentsResult.extendOrder) {
                _.forEach(marketIntentsResult.extendOrder, (iExtendOrder) => {
                    intents.market = intents.market || {};
                    intents.market.extendOrder = intents.market.extendOrder || [];
                    intents.market.extendOrder.push({
                        orderId: ""+iExtendOrder.orderId,
                        addAmount: parseInt(iExtendOrder.addAmount),
                    });
                });
            }
            if(marketIntentsResult.deal) {
                _.forEach(marketIntentsResult.deal, (iDeal) => {
                    intents.market = intents.market || {};
                    intents.market.deal = intents.market.deal || [];
                    intents.market.deal.push({
                        orderId: ""+iDeal.orderId,
                        amount: parseInt(iDeal.amount),
                        targetRoomName: ""+iDeal.targetRoomName
                    });
                });
            }
            continue;
        }

        var object = userRuntimeData.userObjects[i] || userRuntimeData.roomObjects[i]

        if(!object) {
            continue;
        }

        var objectIntentsResult = userIntents[i];

        intents[object.room] = intents[object.room] || {};

        var objectIntents = intents[object.room][i] = {};

        // transfer can be invoked by another player

        if(objectIntentsResult.transfer) {
            objectIntents.transfer = {
                id: ""+objectIntentsResult.transfer.id,
                amount: parseInt(objectIntentsResult.transfer.amount),
                resourceType: ""+objectIntentsResult.transfer.resourceType
            };
        }

        if(objectIntentsResult.move) {
            objectIntents.move = {
                direction: parseInt(objectIntentsResult.move.direction)
            };
        }
        if(objectIntentsResult.harvest) {
            objectIntents.harvest = {
                id: ""+objectIntentsResult.harvest.id
            };
        }
        if(objectIntentsResult.attack) {
            objectIntents.attack = {
                id: ""+objectIntentsResult.attack.id,
                x: parseInt(objectIntentsResult.attack.x),
                y: parseInt(objectIntentsResult.attack.y)
            };
        }
        if(objectIntentsResult.rangedAttack) {
            objectIntents.rangedAttack = {
                id: ""+objectIntentsResult.rangedAttack.id
            };
        }
        if(objectIntentsResult.rangedMassAttack) {
            objectIntents.rangedMassAttack = {};
        }
        if(objectIntentsResult.heal) {
            objectIntents.heal = {
                id: ""+objectIntentsResult.heal.id,
                x: parseInt(objectIntentsResult.heal.x),
                y: parseInt(objectIntentsResult.heal.y)
            };
        }
        if(objectIntentsResult.rangedHeal) {
            objectIntents.rangedHeal = {
                id: ""+objectIntentsResult.rangedHeal.id
            };
        }
        if(objectIntentsResult.repair) {
            objectIntents.repair = {
                id: ""+objectIntentsResult.repair.id,
                x: parseInt(objectIntentsResult.repair.x),
                y: parseInt(objectIntentsResult.repair.y)
            };
        }
        if(objectIntentsResult.build) {
            objectIntents.build = {
                id: ""+objectIntentsResult.build.id,
                x: parseInt(objectIntentsResult.build.x),
                y: parseInt(objectIntentsResult.build.y)
            };
        }
        if(objectIntentsResult.transferEnergy) {
            objectIntents.transferEnergy = {
                id: ""+objectIntentsResult.transferEnergy.id,
                amount: parseInt(objectIntentsResult.transferEnergy.amount)
            };
        }
        if(objectIntentsResult.drop) {
            objectIntents.drop = {
                amount: parseInt(objectIntentsResult.drop.amount),
                resourceType: ""+objectIntentsResult.drop.resourceType
            };
        }
        if(objectIntentsResult.pickup) {
            objectIntents.pickup = {
                id: ""+objectIntentsResult.pickup.id
            };
        }
        if(objectIntentsResult.createCreep) {
            objectIntents.createCreep = {
                name: ""+objectIntentsResult.createCreep.name,
                body: _.filter(objectIntentsResult.createCreep.body, (i) => _.contains(C.BODYPARTS_ALL, i))
            };
        }
        if(objectIntentsResult.renewCreep) {
            objectIntents.renewCreep = {
                id: ""+objectIntentsResult.renewCreep.id
            };
        }
        if(objectIntentsResult.recycleCreep) {
            objectIntents.recycleCreep = {
                id: ""+objectIntentsResult.recycleCreep.id
            };
        }
        if(objectIntentsResult.suicide) {
            objectIntents.suicide = {};
        }
        if(objectIntentsResult.remove) {
            objectIntents.remove = {};
        }
        if(objectIntentsResult.unclaim) {
            objectIntents.unclaim = {};
        }
        if(objectIntentsResult.say) {
            objectIntents.say = {
                message: objectIntentsResult.say.message.substring(0,10),
                isPublic: !!objectIntentsResult.say.isPublic
            };
        }
        if(objectIntentsResult.claimController) {
            objectIntents.claimController = {
                id: ""+objectIntentsResult.claimController.id
            };
        }
        if(objectIntentsResult.attackController) {
            objectIntents.attackController = {
                id: ""+objectIntentsResult.attackController.id
            };
        }
        if(objectIntentsResult.unclaimController) {
            objectIntents.unclaimController = {
                id: ""+objectIntentsResult.unclaimController.id
            };
        }
        if(objectIntentsResult.upgradeController) {
            objectIntents.upgradeController = {
                id: ""+objectIntentsResult.upgradeController.id
            };
        }
        if(objectIntentsResult.reserveController) {
            objectIntents.reserveController = {
                id: ""+objectIntentsResult.reserveController.id
            };
        }
        if(objectIntentsResult.notifyWhenAttacked) {
            objectIntents.notifyWhenAttacked = {
                enabled: !!objectIntentsResult.notifyWhenAttacked.enabled
            };
        }
        if(objectIntentsResult.setPosition) {
            objectIntents.setPosition = {
                x: parseInt(objectIntentsResult.setPosition.x),
                y: parseInt(objectIntentsResult.setPosition.y),
                roomName: ""+objectIntentsResult.setPosition.roomName
            };
        }
        if(objectIntentsResult.setColor) {
            objectIntents.setColor = {
                color: ""+objectIntentsResult.setColor.color,
                secondaryColor: ""+objectIntentsResult.setColor.secondaryColor
            };
        }
        if(objectIntentsResult.destroy) {
            objectIntents.destroy = {};
        }
        if(objectIntentsResult.observeRoom) {
            objectIntents.observeRoom = {
                roomName: ""+objectIntentsResult.observeRoom.roomName
            };
        }
        if(objectIntentsResult.processPower) {
            objectIntents.processPower = {};
        }
        if(objectIntentsResult.dismantle) {
            objectIntents.dismantle = {
                id: ""+objectIntentsResult.dismantle.id
            };
        }
        if(objectIntentsResult.runReaction) {
            objectIntents.runReaction = {
                lab1: ""+objectIntentsResult.runReaction.lab1,
                lab2: ""+objectIntentsResult.runReaction.lab2
            };
        }
        if(objectIntentsResult.boostCreep) {
            objectIntents.boostCreep = {
                id: ""+objectIntentsResult.boostCreep.id,
                bodyPartsCount: parseInt(objectIntentsResult.boostCreep.bodyPartsCount)
            };
        }
        if(objectIntentsResult.send) {
            objectIntents.send = {
                targetRoomName: ""+objectIntentsResult.send.targetRoomName,
                resourceType: ""+objectIntentsResult.send.resourceType,
                amount: parseInt(objectIntentsResult.send.amount),
                description: (""+(objectIntentsResult.send.description||"")).substring(0,100)
            };
        }
        if(objectIntentsResult.launchNuke) {
            objectIntents.launchNuke = {
                roomName: ""+objectIntentsResult.launchNuke.roomName,
                x: parseInt(objectIntentsResult.launchNuke.x),
                y: parseInt(objectIntentsResult.launchNuke.y)
            };
        }
        if(objectIntentsResult.setPublic) {
            objectIntents.setPublic = {
                isPublic: !!objectIntentsResult.setPublic.isPublic
            };
        }
        if(objectIntentsResult.withdraw) {
            objectIntents.withdraw = {
                id: ""+objectIntentsResult.withdraw.id,
                amount: parseInt(objectIntentsResult.withdraw.amount),
                resourceType: ""+objectIntentsResult.withdraw.resourceType
            };
        }
        if(objectIntentsResult.activateSafeMode) {
            objectIntents.activateSafeMode = {};
        }
        if(objectIntentsResult.generateSafeMode) {
            objectIntents.generateSafeMode = {
                id: ""+objectIntentsResult.generateSafeMode.id,
            };
        }
        if(objectIntentsResult.signController) {
            objectIntents.signController = {
                id: ""+objectIntentsResult.signController.id,
                sign: (""+objectIntentsResult.signController.sign).substring(0,100)
            };
        }


        for(var iCustomType in driver.config.customIntentTypes) {
            if(objectIntentsResult[iCustomType]) {
                objectIntents[iCustomType] = {};
                for(var prop in driver.config.customIntentTypes[iCustomType]) {
                    switch(driver.config.customIntentTypes[iCustomType][prop]) {
                        case 'string': {
                            objectIntents[iCustomType][prop] = "" + objectIntentsResult[iCustomType][prop];
                            break;
                        }
                        case 'number': {
                            objectIntents[iCustomType][prop] = +objectIntentsResult[iCustomType][prop];
                            break;
                        }
                        case 'boolean': {
                            objectIntents[iCustomType][prop] = !!objectIntentsResult[iCustomType][prop];
                            break;
                        }
                    }
                }
            }
        }

    }

    return intents;
}

exports.sendAttackingNotification = function(target, roomController) {
    var driver = exports.getDriver();
    var labelText;
    if(target.type == 'creep') {
        labelText = 'creep '+target.name;
    }
    else if(target.type == 'spawn') {
        labelText = 'spawn '+target.name;
    }
    else {
        labelText = `${target.type} #${target._id}`;
    }
    var user = target.user ? target.user : roomController ? roomController.user : null;
    if(user) {
        driver.sendNotification(user, `Your ${labelText} in room ${target.room} is under attack!`);
    }
};

exports.checkStructureAgainstController = function(object, roomObjects, roomController) {
    // owner-less objects are always active
    if(!object.user) {
        return true;
    }

    // eliminate some other easy cases
    if(!roomController || roomController.level < 1 || roomController.user !== object.user) {
        return false;
    }

    let allowedRemaining = C.CONTROLLER_STRUCTURES[object.type][roomController.level];

    if(allowedRemaining === 0) {
        return false;
    }
    
    // if only one object ever allowed, this is it
    if(C.CONTROLLER_STRUCTURES[object.type][8] === 1) {
        return allowedRemaining !== 0;
    }

    // Scan through the room objects of the same type and count how many are closer. 
    let foundSelf = false;
    let objectDist = Math.max(Math.abs(object.x - roomController.x), Math.abs(object.y - roomController.y));
    let objectIds = _.keys(roomObjects);
    for (let i = 0; i < objectIds.length; i++) {
        let compareObj = roomObjects[objectIds[i]];
        if(compareObj.type === object.type && compareObj.user === object.user) {
            let compareDist = Math.max(Math.abs(compareObj.x - roomController.x), Math.abs(compareObj.y - roomController.y));
            
            if(compareDist < objectDist) {
                allowedRemaining--;
                if (allowedRemaining === 0) {
                    return false;
                }
            } else if(!foundSelf && compareDist === objectDist) {
                // Objects of equal distance that are discovered before we scan over the selected object are considered closer
                if(object === compareObj) {
                    foundSelf = true;
                } else {
                    allowedRemaining--;
                    if (allowedRemaining === 0) {
                        return false;
                    }
                }
            }
        }
    }

    return true;
};

exports.defineGameObjectProperties = function(obj, dataFn, properties) {
    var propertiesInfo = {};

    for(var name in properties) {
        eval(`
            propertiesInfo['${name}'] = {
                enumerable: true,
                get() {
                    if(!this['_${name}']) {
                        this['_${name}'] = properties['${name}'](dataFn(this.id));
                    }
                    return this['_${name}'];
                }
            }`);
    }
    Object.defineProperties(obj, propertiesInfo);

    obj.toJSON = function() {
        var result = {};
        for(var i in this) {
            if(i[0] == '_' || _.contains(['toJSON','toString'],i)) {
                continue;
            }
            result[i] = this[i];
        }
        return result;
    }
};

exports.serializePath = function(path) {
    if(!_.isArray(path)) {
        throw new Error('path is not an array');
    }
    var result = '';
    if(!path.length) {
        return result;
    }
    if(path[0].x < 0 || path[0].y < 0) {
        throw new Error('path coordinates cannot be negative');
    }
    result += path[0].x > 9 ? path[0].x : '0'+path[0].x;
    result += path[0].y > 9 ? path[0].y : '0'+path[0].y;

    for(var i=0; i<path.length; i++) {
        result += path[i].direction;
    }

    return result;
};

exports.deserializePath = function(path) {
    if(!_.isString(path)) {
        throw new Error('`path` is not a string');
    }

    var result = [];
    if(!path.length) {
        return result;
    }
    var x,y, direction, dx, dy;

    x = parseInt(path.substring(0, 2));
    y = parseInt(path.substring(2, 4));
    if(_.isNaN(x) || _.isNaN(y)) {
        throw new Error('`path` is not a valid serialized path string');
    }

    for (var i = 4; i < path.length; i++) {
        direction = parseInt(path.charAt(i));
        if(!offsetsByDirection[direction]) {
            throw new Error('`path` is not a valid serialized path string');
        }
        dx = offsetsByDirection[direction][0];
        dy = offsetsByDirection[direction][1];
        if (i > 4) {
            x += dx;
            y += dy;
        }
        result.push({
            x, y,
            dx, dy,
            direction
        });
    }


    return result;
};

exports.calcResources = function(object) {
    return _.sum(C.RESOURCES_ALL, i => typeof object[i] == 'object' ? object[i].amount : (object[i] || 0));
};

exports.calcBodyEffectiveness = function(body, bodyPartType, methodName, basePower, withoutOldHits) {
    var power = 0;
    body.forEach(i => {
        if(!(i.hits || !withoutOldHits && i._oldHits) || i.type != bodyPartType) {
            return;
        }
        var iPower = basePower;
        if(i.boost && C.BOOSTS[bodyPartType][i.boost] && C.BOOSTS[bodyPartType][i.boost][methodName]) {
            iPower *= C.BOOSTS[bodyPartType][i.boost][methodName];
        }
        power += iPower;
    });
    return power;
};

exports.roundCredits = function(value) {
    return Math.ceil(((+value)*100).toFixed(0))/100;
};

exports.roundCredits3 = function(value) {
    return Math.ceil(((+value)*1000).toFixed(0))/1000;
};

exports.calcRoomsDistance = function(room1, room2, continuous) {
    var [x1,y1] = exports.roomNameToXY(room1);
    var [x2,y2] = exports.roomNameToXY(room2);
    var dx = Math.abs(x2-x1);
    var dy = Math.abs(y2-y1);
    if(continuous) {
        dx = Math.min(C.WORLD_WIDTH - dx, dx);
        dy = Math.min(C.WORLD_HEIGHT - dy, dy);
    }
    return Math.max(dx, dy);
};

exports.calcTerminalEnergyCost = function(amount, range) {
    return Math.ceil(amount * (1 - Math.exp(-range / 30)))
};