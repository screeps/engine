var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(object, {gameTime, bulk, roomController}) {

    if(roomController) {
        var storeCapacity = roomController.level > 0 && roomController.user == object.user && C.CONTROLLER_STRUCTURES.terminal[roomController.level] ? C.TERMINAL_CAPACITY : 0;
        if(storeCapacity != object.storeCapacity) {
            bulk.update(object, {storeCapacity});
        }

        if(object.limit === undefined || object.limitUpdateTime === undefined) {
            object.limit = 0;
            object.limitUpdateTime = gameTime;
            bulk.update(object, {
                limit: object.limit,
                limitUpdateTime: object.limitUpdateTime
            });
        }

        let operateEffect = null, disruptEffect = null;
        if(!!object.effects) {
            _.forEach(object.effects, function (effect) {
                if (effect.endTime <= gameTime) {
                    return;
                }
                if (effect.power == C.PWR_OPERATE_TERMINAL) {
                    operateEffect = effect;
                }
                if (effect.power == C.PWR_DISRUPT_TERMINAL) {
                    disruptEffect = effect;
                }
            });
        }

        if(!!operateEffect || !!disruptEffect) {
            let throughput = C.TERMINAL_THROUGHPUT;

            if(operateEffect) {
                throughput = C.TERMINAL_THROUGHPUT_OPERATED[operateEffect.level];
            }

            if(disruptEffect) {
                throughput = throughput * C.TERMINAL_THROUGHPUT_DISRUPT_MULTIPLIER[disruptEffect.level];
            }

            const limit = Math.min(C.TERMINAL_THROUGHPUT_MAX_LIMIT, object.limit + throughput);
            if(object.limit != limit) {
                object.limit = limit;
                object.limitUpdateTime = gameTime;
                bulk.update(object, {
                    limit: object.limit,
                    limitUpdateTime: object.limitUpdateTime
                });
            }
        }
    }

};
