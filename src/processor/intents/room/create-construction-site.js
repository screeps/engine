var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    config = require('../../../config');

var createdConstructionSiteCounter = 0;

module.exports = function(intent, roomObjects, roomTerrain, bulk, bulkUsers, roomController) {

    if(intent.x <= 0 || intent.x >= 49 || intent.y <= 0 || intent.y >= 49) {
        return;
    }

    if(!C.CONSTRUCTION_COST[intent.structureType]) {
        return;
    }

    if(/^(W|E)/.test(intent.roomName)) {

        if (roomController && (roomController.user && roomController.user != intent.user || roomController.reservation && roomController.reservation.user != intent.user)) {
            return;
        }

        if (!utils.checkControllerAvailability(intent.structureType, roomObjects, roomController)) {
            return;
        }
    }

    if(!utils.checkConstructionSite(roomObjects, intent.structureType, intent.x, intent.y) ||
        !utils.checkConstructionSite(roomTerrain, intent.structureType, intent.x, intent.y)) {
        return;
    }

    var progressTotal = C.CONSTRUCTION_COST[intent.structureType];

    if(intent.structureType == 'road' &&
        (_.any(roomObjects, {x: intent.x, y: intent.y, type: 'swamp'}) ||
        utils.checkTerrain(roomTerrain, intent.x, intent.y, C.TERRAIN_MASK_SWAMP))) {
        progressTotal *= C.CONSTRUCTION_COST_ROAD_SWAMP_RATIO;
    }

    if(config.ptr) {
        progressTotal = 1;
    }

    if(intent.roomName == 'sim' && intent.structureType == 'tower') {
        progressTotal = 100;
    }

    var obj = {
        structureType: intent.structureType,
        x: intent.x,
        y: intent.y,
        type: 'constructionSite',
        room: intent.roomName,
        user: intent.user,
        progress: 0,
        progressTotal
    };

    if(intent.structureType == 'spawn') {
        obj.name = intent.name;
    }

    bulk.insert(obj);

    roomObjects['_createdConstructionSite'+createdConstructionSiteCounter] = obj;
    createdConstructionSiteCounter++;
};