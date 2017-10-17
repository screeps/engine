var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(spawn, intent, roomObjects, roomTerrain, bulk) {
    if(spawn.type != 'spawn')
        return;
    const spawnDirections = intent.spawnDirections;
    if(_.isArray(spawnDirections) && spawnDirections.length > 0) {
        // convert directions to numbers, eliminate duplicates
        spawnDirections = _.uniq(_.map(spawnDirections, e => +e));
        // bail if any numbers are out of bounds or non-integers
        if(!_.any(spawnDirections, (direction)=>direction < 1 || direction > 8 || direction !== (direction | 0))) {
            bulk.update(spawn, {spawnDirections});
        }
    }
};