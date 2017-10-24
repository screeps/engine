var _ = require('lodash'),
    utils =  require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(spawn, intent, roomObjects, roomTerrain, bulk) {
    if(spawn.type != 'spawn')
        return;
    var directions = intent.directions;
    if(_.isArray(directions) && directions.length > 0) {
        // convert directions to numbers, eliminate duplicates
        directions = _.uniq(_.map(directions, e => +e));
        // bail if any numbers are out of bounds or non-integers
        if(!_.any(directions, (direction)=>direction < 1 || direction > 8 || direction !== (direction | 0))) {
            bulk.update(spawn, {spawning:{directions}});
        }
    }
};