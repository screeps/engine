var _ = require('lodash'),
    utils = require('../../../utils'),
    driver = utils.getDriver(),
    C = driver.constants;

module.exports = function(userId, intent, {flags}) {

    var name = intent.name.replace(/\|/g,"$VLINE$").replace(/~/g,"$TILDE$");

    if(_.any(flags, i => {
        return i.user == userId && _.any(i._parsed, j => j[0] == name);
    })) {
        return;
    }
    if(!intent.color || !_.contains(C.COLORS_ALL, intent.color)) {
        return;
    }
    if(!intent.secondaryColor || !_.contains(C.COLORS_ALL, intent.secondaryColor)) {
        return;
    }

    if(intent.x < 0 || intent.x > 49 || intent.y < 0 || intent.y > 49) {
        return;
    }

    var flagItem = _.find(flags, {user: userId});
    if(!flagItem) {
        flagItem = {user: userId, room: intent.roomName, _parsed: []};
        flags.push(flagItem);
    }

    flagItem._modified = true;
    flagItem._parsed.push([name, intent.color, intent.secondaryColor, intent.x, intent.y]);
};