var utils = require('./../utils'),
    rooms = require('./rooms'),
    driver = utils.getRuntimeDriver(),
    C = driver.constants;

var scope = {};

module.exports = function(name, parent, properties, prototypeExtender, userOwned) {
    return function (_runtimeData, _intents, _register, _globals) {

        scope.runtimeData = _runtimeData;
        scope.intents = _intents;
        scope.register = _register;
        scope.globals = _globals;

        if (scope.globals[name]) {
            return;
        }

        var data = (id) => {
            if (!scope.runtimeData.roomObjects[id]) {
                throw new Error("Could not find an object with ID " + id);
            }
            return scope.runtimeData.roomObjects[id];
        };

        var _CustomObject = scope.register.wrapFn(function (id) {
            var _data = data(id);
            if(parent) {
                scope.globals[parent].call(this, id);
            }
            else {
                scope.globals.RoomObject.call(this, _data.x, _data.y, _data.room);
            }
            this.id = id;
        });

        _CustomObject.prototype = Object.create(parent ? scope.globals[parent].prototype : scope.globals.RoomObject.prototype);
        _CustomObject.prototype.constructor = _CustomObject;

        if(properties) {
            utils.defineGameObjectProperties(_CustomObject.prototype, data, properties);
        }

        if(userOwned) {
            utils.defineGameObjectProperties(_CustomObject.prototype, data, {
                my: (o) => o.user == scope.runtimeData.user._id,
                owner: (o) => new Object({username: scope.runtimeData.users[o.user].username}),
            });
        }

        if(prototypeExtender) {
            prototypeExtender(_CustomObject.prototype, scope);
        }

        scope.globals[name] = _CustomObject;
    }
};