#!/usr/bin/env node
var q = require('q'),
    _ = require('lodash'),
    movement = require('./processor/intents/movement'),
    utils = require('./utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    config = require('./config'),
    fakeRuntime = require('./processor/common/fake-runtime');

var roomsQueue, usersQueue, lastRoomsStatsSaveTime = 0, currentHistoryPromise = q.when();

const KEEPER_ID = "3";
const INVADER_ID = "2";

function processRoom(roomId, {intents, roomObjects, users, roomTerrain, gameTime, roomInfo, flags}) {

    return q.when().then(() => {

        var bulk = driver.bulkObjectsWrite(),
            bulkUsers = driver.bulkUsersWrite(),
            bulkFlags = driver.bulkFlagsWrite(),
            bulkUsersPowerCreeps = driver.bulkUsersPowerCreeps(),
            oldObjects = {},
            hasNewbieWalls = false,
            stats = driver.getRoomStatsUpdater(roomId),
            objectsToHistory = {},
            roomSpawns = [], roomExtensions = [], roomNukes = [], keepers = [], invaders = [], invaderCore = null,
            oldRoomInfo = _.clone(roomInfo);

        let activateRoom = false;

        var terrainItem = roomTerrain[_.findKey(roomTerrain)];
        if (terrainItem.terrain) {
            roomTerrain = terrainItem.terrain;
        }

        let eventLog = [];

        let scope = {roomObjects, roomTerrain, bulk, bulkUsers, bulkUsersPowerCreeps, stats, flags,
            bulkFlags, gameTime, roomInfo, users, eventLog};

        _.forEach(roomObjects, (object) => {
            if(!object) {
                return;
            }

            if (object.type == 'creep') {
                object._actionLog = object.actionLog;
                object._ticksToLive = object.ageTime - gameTime;
                object.actionLog = {
                    attacked: null,
                    healed: null,
                    attack: null,
                    rangedAttack: null,
                    rangedMassAttack: null,
                    rangedHeal: null,
                    harvest: null,
                    heal: null,
                    repair: null,
                    build: null,
                    say: null,
                    upgradeController: null,
                    reserveController: null
                };
                if(object.user == KEEPER_ID) {
                    keepers.push(object);
                } else if ((object.user == INVADER_ID) && !object.strongholdId) {
                    invaders.push(object);
                }
            }
            if(object.type == 'invaderCore') {
                invaderCore = object;
                object._actionLog = object.actionLog;
                object.actionLog = {
                    transferEnergy: null,
                    reserveController: null,
                    attackController: null,
                    upgradeController: null
                };
                if(object.deployTime) {
                    activateRoom = true;
                }
            }
            if (object.type == 'link') {
                object._actionLog = object.actionLog;
                object.actionLog = {
                    transferEnergy: null
                };
            }
            if (object.type == 'lab') {
                object._actionLog = object.actionLog;
                object.actionLog = {
                    runReaction: null,
                    reverseReaction: null
                };
            }
            if (object.type == 'tower') {
                object._actionLog = object.actionLog;
                object.actionLog = {
                    attack: null,
                    heal: null,
                    repair: null
                };
            }
            if (object.type == 'controller') {
                scope.roomController = object;
                if(object.reservation && object.reservation.user == '2' &&
                    (object.reservation.endTime - gameTime) < (C.CONTROLLER_RESERVE_MAX - C.INVADER_CORE_CONTROLLER_POWER * C.CONTROLLER_RESERVE)) {
                    activateRoom = true;
                }
                if(object.user && object.user !== '2') {
                    activateRoom = true;
                }
            }
            if (object.type == 'observer') {
                object.observeRoom = null;
            }
            if (object.user && object.user != '3' && !object.userNotActive && object.type != 'flag' && !object.strongholdId && object.type !== 'controller') {
                activateRoom = true;
            }
            if(object.type == 'powerBank' && gameTime > object.decayTime - 500) {
                activateRoom = true;
            }
            if(object.type == 'deposit' && gameTime > object.decayTime - 500) {
                activateRoom = true;
            }
            if(object.type == 'energy') {
                activateRoom = true;
            }
            if(object.type == 'nuke') {
                activateRoom = true;
                roomNukes.push(object);
            }
            if(object.type == 'tombstone') {
                activateRoom = true;
            }
            if(object.type == 'portal') {
                activateRoom = true;
            }
            if (object.type == 'constructedWall' && object.decayTime && object.user) {
                hasNewbieWalls = true;
            }

            if(object.type == 'extension') {
                roomExtensions.push(object);
            }
            if(object.type == 'spawn') {
                roomSpawns.push(object);
            }
            if (object.type == 'powerCreep') {
                object._actionLog = object.actionLog;
                object.actionLog = {
                    spawned: null,
                    attack: null,
                    attacked: null,
                    healed: null,
                    power: null,
                    say: null,
                };
            }
            if(object.type == 'factory') {
                object._actionLog = object.actionLog;
                object.actionLog = {
                    produce: null
                };
            }

            driver.config.emit('processObject',object, roomObjects, roomTerrain, gameTime, roomInfo, bulk, bulkUsers);

        });

        intents = intents || { users: {} };
        driver.pathFinder.make({ RoomPosition: fakeRuntime.RoomPosition });

        for(let nuke of roomNukes) {
            require('./processor/intents/nukes/pretick')(nuke, intents, scope);
        }

        for(let keeper of keepers) {
            const i = require('./processor/intents/creeps/keepers/pretick')(keeper, scope);

            intents.users[keeper.user] = intents.users[keeper.user] || {};
            intents.users[keeper.user].objects = intents.users[keeper.user].objects || {};
            const objectsIntents =  intents.users[keeper.user].objects;
            _.forEach(i, (ii, objId) => {
                objectsIntents[objId] = _.assign(
                    ii,
                    objectsIntents[objId] || {}
                );
            });
        }

        for(let invader of invaders) {
            const i = require('./processor/intents/creeps/invaders/pretick')(invader, scope);

            intents.users[invader.user] = intents.users[invader.user] || {};
            intents.users[invader.user].objects = intents.users[invader.user].objects || {};
            const objectIntents = intents.users[invader.user].objects;
            _.forEach(i, (ii, objId) => {
                objectIntents[objId] = _.assign(
                    ii,
                    objectIntents[objId] || {}
                );
            });
        }

        if(invaderCore && invaderCore.user) {
            const i = require('./processor/intents/invader-core/pretick')(invaderCore, scope);

            intents.users[invaderCore.user] = intents.users[invaderCore.user] || {};
            intents.users[invaderCore.user].objects = intents.users[invaderCore.user].objects || {};
            _.forEach(i, (ii, objId) => {
                intents.users[invaderCore.user].objects[objId] = _.assign(
                    ii,
                    intents.users[invaderCore.user].objects[objId] || {}
                );
            });
        }

        if(roomSpawns.length || roomExtensions.length) {
            require('./processor/intents/_calc_spawns')(roomSpawns, roomExtensions, scope);
        }

        movement.init(roomObjects, roomTerrain);

        if (intents) {

            _.forEach(intents.users, (userIntents, userId) => {

                if (userIntents.objectsManual) {
                    userIntents.objects = userIntents.objects || {};
                    _.extend(userIntents.objects, userIntents.objectsManual);
                }

                for (var objectId in userIntents.objects) {

                    var objectIntents = userIntents.objects[objectId],
                    object = roomObjects[objectId];

                    if (objectId == 'room') {
                        require('./processor/intents/room/intents')(userId, objectIntents, scope);
                        continue;
                    }

                    if (!object || object._skip || object.user && object.user != userId) continue;

                    if (object.type == 'creep')
                        require('./processor/intents/creeps/intents')(object, objectIntents, scope);
                    if (object.type == 'powerCreep')
                        require('./processor/intents/power-creeps/intents')(object, objectIntents, scope);
                    if (object.type == 'link')
                        require('./processor/intents/links/intents')(object, objectIntents, scope);
                    if (object.type == 'tower')
                        require('./processor/intents/towers/intents')(object, objectIntents, scope);
                    if (object.type == 'lab')
                        require('./processor/intents/labs/intents')(object, objectIntents, scope);
                    if (object.type == 'spawn')
                        require('./processor/intents/spawns/intents')(object, objectIntents, scope);

                    if (object.type == 'constructionSite') {
                    }

                    if (object.type == 'rampart') {
                        if (objectIntents.setPublic) {
                            require('./processor/intents/ramparts/set-public')(object, objectIntents.setPublic, scope);
                        }
                    }

                    if (object.type == 'terminal') {
                        if (objectIntents.send) {
                            require('./processor/intents/terminal/send')(object, objectIntents.send, scope);
                        }
                    }

                    if (object.type == 'nuker') {
                        if (objectIntents.launchNuke) {
                            require('./processor/intents/nukers/launch-nuke')(object, objectIntents.launchNuke, scope);
                        }
                    }

                    if(object.type == 'observer') {
                        if(objectIntents.observeRoom) {
                            object.observeRoom = objectIntents.observeRoom.roomName;
                        }
                    }

                    if(object.type == 'powerSpawn') {
                        require('./processor/intents/power-spawns/intents')(object, objectIntents, scope);
                    }

                    if(object.type == 'invaderCore') {
                        require('./processor/intents/invader-core/intents')(object, objectIntents, scope);
                    }

                    if (object.type == 'factory') {
                        if (objectIntents.produce) {
                            require('./processor/intents/factories/produce')(object, objectIntents.produce, scope);
                        }
                    }

                    if(object.type == 'controller') {
                        if(objectIntents.unclaim) {
                            require('./processor/intents/controllers/unclaim')(object, objectIntents.unclaim, scope);
                        }
                        if(objectIntents.activateSafeMode) {
                            require('./processor/intents/controllers/activateSafeMode')(object, objectIntents.activateSafeMode, scope);
                        }
                    }

                    if (objectIntents.notifyWhenAttacked && (C.CONSTRUCTION_COST[object.type] || object.type == 'creep' || object.type == 'powerCreep')) {
                        bulk.update(object, {notifyWhenAttacked: !!objectIntents.notifyWhenAttacked.enabled});
                    }


                    driver.config.emit('processObjectIntents',object, userId, objectIntents, roomObjects, roomTerrain,
                        gameTime, roomInfo, bulk, bulkUsers);
                }
            });
        }

        movement.check(scope.roomController && scope.roomController.safeMode > gameTime ? scope.roomController.user : false);

        scope.energyAvailable = _(roomObjects).filter((i) => !i.off && (i.type == 'spawn' || i.type == 'extension')).sum('store.energy');

        var mapView = {
            w: [],
            r: [],
            pb: [],
            p: [],
            s: [],
            c: [],
            m: [],
            k: []
        };

        var resultPromises = [];
        var userVisibility = {};

        _.forEach(roomObjects, (object) => {

            if(!object || object._skip) {
                return;
            }

            if (object.type == 'invaderCore')
                require('./processor/intents/invader-core/tick')(object, scope);
            if (object.type == 'energy')
                require('./processor/intents/energy/tick')(object, scope);
            if (object.type == 'source')
                require('./processor/intents/sources/tick')(object, scope);
            if (object.type == 'deposit')
                require('./processor/intents/deposits/tick')(object, scope);
            if (object.type == 'mineral')
                require('./processor/intents/minerals/tick')(object, scope);
            if (object.type == 'creep')
                require('./processor/intents/creeps/tick')(object, scope);
            if (object.type == 'powerCreep')
                require('./processor/intents/power-creeps/tick')(object, scope);
            if (object.type == 'spawn')
                require('./processor/intents/spawns/tick')(object, scope);
            if (object.type == 'rampart')
                require('./processor/intents/ramparts/tick')(object, scope);
            if (object.type == 'extension')
                require('./processor/intents/extensions/tick')(object, scope);
            if (object.type == 'road')
                require('./processor/intents/roads/tick')(object, scope);
            if (object.type == 'constructionSite')
                require('./processor/intents/construction-sites/tick')(object, scope);
            if (object.type == 'keeperLair')
                require('./processor/intents/keeper-lairs/tick')(object, scope);
            if (object.type == 'portal')
                require('./processor/intents/portals/tick')(object, scope);
            if (object.type == 'constructedWall')
                require('./processor/intents/constructedWalls/tick')(object, scope);
            if (object.type == 'link')
                require('./processor/intents/links/tick')(object, scope);
            if (object.type == 'extractor')
                require('./processor/intents/extractors/tick')(object, scope);
            if (object.type == 'tower')
                require('./processor/intents/towers/tick')(object, scope);
            if (object.type == 'controller')
                require('./processor/intents/controllers/tick')(object, scope);
            if (object.type == 'lab')
                require('./processor/intents/labs/tick')(object, scope);
            if (object.type == 'container')
                require('./processor/intents/containers/tick')(object, scope);
            if (object.type == 'terminal')
                require('./processor/intents/terminal/tick')(object, scope);
            if (object.type == 'tombstone')
                require('./processor/intents/tombstones/tick')(object, scope);
            if (object.type == 'ruin')
                require('./processor/intents/ruins/tick')(object, scope);
            if (object.type == 'factory')
                require('./processor/intents/factories/tick')(object, scope);

            if (object.type == 'nuke') {
                require('./processor/intents/nukes/tick')(object, scope);
            }

            if(object.type == 'observer') {
                bulk.update(object, {observeRoom: object.observeRoom});
                //resultPromises.push(core.setUserRoomVisibility(object.user, object.observeRoom));
            }

            if (object.type == 'storage') {
                require('./processor/intents/storages/tick')(object, scope);
            }

            if(object.effects) {
                const collapseEffect = _.find(object.effects, {effect: C.EFFECT_COLLAPSE_TIMER});
                if(collapseEffect && collapseEffect.endTime <= gameTime) {
                    bulk.remove(object._id);
                    delete roomObjects[object._id];
                    return;
                }
            }

            if(object.type == 'powerBank' || object.type == 'deposit') {
                if(gameTime >= object.decayTime-1) {
                    bulk.remove(object._id);
                    delete roomObjects[object._id];
                }
            }

            if (object.type != 'flag') {
                objectsToHistory[object._id] = object;

                if (object.type == 'creep' || object.type == 'powerCreep') {
                    objectsToHistory[object._id] = JSON.parse(JSON.stringify(object));
                    objectsToHistory[object._id]._id = "" + object._id;
                    delete objectsToHistory[object._id]._actionLog;
                    delete objectsToHistory[object._id]._ticksToLive;
                    if (object.actionLog.say && !object.actionLog.say.isPublic) {
                        delete objectsToHistory[object._id].actionLog.say;
                    }
                }
            }

            if (object.user) {
                //userVisibility[object.user] = true;

                if(object.type != 'constructionSite' && !object.newbieWall &&
                    object.type != 'ruin' && object.type != 'tombstone' &&
                   (object.type != 'rampart' || !object.isPublic)) {
                    mapView[object.user] = mapView[object.user] || [];
                    mapView[object.user].push([object.x, object.y]);
                }
            }
            else if (object.type == 'constructedWall') {
                mapView.w.push([object.x, object.y]);
            }
            else if (object.type == 'road') {
                mapView.r.push([object.x, object.y]);
            }
            else if (object.type == 'powerBank') {
                mapView.pb.push([object.x, object.y]);
            }
            else if (object.type == 'portal') {
                mapView.p.push([object.x, object.y]);
            }
            else if (object.type == 'source') {
                mapView.s.push([object.x, object.y]);
            }
            else if (object.type == 'mineral') {
                mapView.m.push([object.x, object.y]);
            }
            else if (object.type == 'deposit') {
                mapView.m.push([object.x, object.y]);
            }
            else if (object.type == 'controller') {
                mapView.c.push([object.x, object.y]);
            }
            else if (object.type == 'keeperLair') {
                mapView.k.push([object.x, object.y]);
            }
            else if(object.type == 'energy' && object.resourceType == 'power') {
                mapView.pb.push([object.x, object.y]);
            }
            driver.config.emit('postProcessObject', object, roomObjects, roomTerrain, gameTime, roomInfo, bulk, bulkUsers, eventLog, mapView);
        });

        /*for(var user in userVisibility) {
            resultPromises.push(core.setUserRoomVisibility(user, roomId));
        }*/

        driver.config.emit('processRoom', roomId, roomInfo, roomObjects, roomTerrain, gameTime, bulk, bulkUsers, eventLog);

        driver.config.emit('processorLoopStage','saveRoom', roomId);

        resultPromises.push(driver.mapViewSave(roomId, mapView));
        resultPromises.push(bulk.execute());
        resultPromises.push(bulkUsers.execute());
        resultPromises.push(bulkFlags.execute());
        resultPromises.push(driver.saveRoomEventLog(roomId, eventLog));

        if(roomInfo.active) { // may be set in intents
            activateRoom = true;
            delete roomInfo.active;
        }

        if(activateRoom) {
            driver.activateRoom(roomId);
            saveRoomHistory(roomId, objectsToHistory, gameTime);
        }

        if(!_.isEqual(roomInfo, oldRoomInfo)) {
            resultPromises.push(driver.saveRoomInfo(roomId, roomInfo));
        }

        if (Date.now() > lastRoomsStatsSaveTime + 30 * 1000) {
            driver.roomsStatsSave();
            lastRoomsStatsSaveTime = Date.now();
        }

        return q.all(resultPromises);
    });
}

function saveRoomHistory(roomId, objects, gameTime) {

    return currentHistoryPromise.then(() => {
        var promise = q.when();

        if (!(gameTime % driver.config.historyChunkSize)) {
            var baseTime = Math.floor((gameTime - 1) / driver.config.historyChunkSize) * driver.config.historyChunkSize;
            promise = driver.history.upload(roomId, baseTime);
        }

        var data = JSON.stringify(objects);
        currentHistoryPromise = promise.then(() => driver.history.saveTick(roomId, gameTime, data));
        return currentHistoryPromise;
    });
}


driver.connect('processor')
    .then(() => driver.queue.create('rooms', 'read'))
    .catch((error) => {
        console.error('Error connecting to driver:', error);
        process.exit(1);
    })
    .then(_roomsQueue => {

        roomsQueue = _roomsQueue;

        function loop() {

            var roomId;

            driver.config.emit('processorLoopStage','start');

            roomsQueue.fetch()
                .then((_roomId) => {
                    driver.config.emit('processorLoopStage','getRoomData', _roomId);
                    roomId = _roomId;
                    return q.all([
                        driver.getRoomIntents(_roomId),
                        driver.getRoomObjects(_roomId),
                        driver.getRoomTerrain(_roomId),
                        driver.getGameTime(),
                        driver.getRoomInfo(_roomId),
                        driver.getRoomFlags(_roomId),
                    ])
                })
                .then((result) => {
                    driver.config.emit('processorLoopStage','processRoom', roomId);
                    processRoom(roomId, {
                        intents: result[0],
                        roomObjects: result[1].objects,
                        users: result[1].users,
                        roomTerrain: result[2],
                        gameTime: result[3],
                        roomInfo: result[4],
                        flags: result[5]
                    })
                    .catch((error) => console.log('Error processing room '+roomId+':', _.isObject(error) ? (error.stack || error) : error))
                    .then(() => {
                        return driver.clearRoomIntents(roomId);
                    })
                    .then(() => roomsQueue.markDone(roomId));
                })
                .catch((error) => console.error('Error in processor loop:', _.isObject(error) && error.stack || error))
                .then(() => {
                    driver.config.emit('processorLoopStage','finish', roomId);
                    setTimeout(loop, 0)
                });
        }

        loop();

    });


if(typeof self == 'undefined') {
    setInterval(() => {
        var rejections = q.getUnhandledReasons();
        rejections.forEach((i) => console.error('Unhandled rejection:', i));
        q.resetUnhandledRejections();
    }, 1000);
}
