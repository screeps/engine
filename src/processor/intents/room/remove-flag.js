var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(userId, intent, {flags}) {

    var flagItem = _.find(flags, {user: userId});
    if(!flagItem) {
        return;
    }

    var name = intent.name.replace(/\|/g,"$VLINE$").replace(/~/g,"$TILDE$");

    if(!_.some(flagItem._parsed, i => i[0] == name)) {
        return;
    }
    flagItem._modified = true;
    _.remove(flagItem._parsed, i => i[0] == name);
};