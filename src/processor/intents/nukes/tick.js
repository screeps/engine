var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, scope) {

    const {roomObjects, bulk, roomController, gameTime, roomInfo} = scope;

    if(roomInfo.novice && roomInfo.novice > Date.now() || roomInfo.respawnArea && roomInfo.respawnArea > Date.now()) {
        bulk.remove(object._id);
        delete roomObjects[object._id];
        return;
    }

    if(gameTime == object.landTime-1) {

        _.forEach(roomObjects, target => {
            if(!target) {
                return;
            }
            if (target.type == 'creep') {
                require('../creeps/_die')(target, 0, scope);
            }
            if(target.type == 'constructionSite' || target.type == 'energy') {
                bulk.remove(target._id);
                delete roomObjects[target._id];
            }
        });

        for(let dx=-2; dx<=2; dx++) {
            for(let dy=-2; dy<=2; dy++) {
                let x = object.x+dx,
                    y = object.y+dy,
                    range = Math.max(Math.abs(dx), Math.abs(dy)),
                    damage = range == 0 ? C.NUKE_DAMAGE[0] : C.NUKE_DAMAGE[2];

                let objects = _.filter(roomObjects, {x,y});
                let rampart = _.find(objects, {type: 'rampart'});
                if(rampart) {
                    let rampartHits = rampart.hits;
                    _.pull(objects, rampart);
                    require('../_damage')(object, rampart, damage, C.EVENT_ATTACK_TYPE_NUKE, scope);
                    damage -= rampartHits;
                }
                if(damage > 0) {
                    objects.forEach(target => {
                        require('../_damage')(object, target, damage, C.EVENT_ATTACK_TYPE_NUKE, scope);
                    });
                }
            }
        }

        if(roomController) {
            if(roomController.safeMode > gameTime) {
                bulk.update(roomController, {
                    safeMode: gameTime,
                    safeModeCooldown: null
                });
            }

            if (roomController.user) {
                bulk.update(roomController, {
                    upgradeBlocked: gameTime + C.CONTROLLER_NUKE_BLOCKED_UPGRADE
                });
            }
        }
    }

    if(gameTime >= object.landTime) {
        bulk.remove(object._id);
        delete roomObjects[object._id];
    };


};