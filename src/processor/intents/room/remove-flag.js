var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(intent, flags) {

    var flagItem = _.find(flags, {user: intent.user});
    if(!flagItem) {
        return;
    }

    var name = intent.name.replace(/\|/g,"$VLINE$").replace(/~/g,"$TILDE$");

    if(!_.any(flagItem._parsed, i => i[0] == name)) {
        return;
    }
    flagItem._modified = true;
    _.remove(flagItem._parsed, i => i[0] == name);
};