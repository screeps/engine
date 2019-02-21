var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;


module.exports = function(object, intent, {roomObjects, bulk, bulkUsers, roomController, stats, gameTime}) {

    if(object.type != 'powerSpawn')
        return;

    if(!utils.checkStructureAgainstController(object, roomObjects, roomController)) {
        return;
    }

    var amount = 1;
    var effect = _.find(object.effects, {power: C.PWR_OPERATE_POWER});
    if(effect && effect.endTime >= gameTime) {
        amount = Math.min(object.power, amount + C.POWER_INFO[C.PWR_OPERATE_POWER].effect[effect.level-1]);
    }

    if(object.power < amount || object.energy < amount * C.POWER_SPAWN_ENERGY_RATIO) {
        return;
    }

    object.power -= amount;
    object.energy -= amount * C.POWER_SPAWN_ENERGY_RATIO;

    stats.inc('powerProcessed', object.user, amount);

    bulk.update(object, {
        energy: object.energy,
        power: object.power
    });

    if(bulkUsers.inc) {
        bulkUsers.inc(object.user, 'power', amount);
    }
};