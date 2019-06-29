var _ = require('lodash'),
    utils = require('./../utils'),
    driver = utils.getRuntimeDriver(),
    C = driver.constants;

var runtimeData, intents, register, globals;

exports.make = function(_runtimeData, _intents, _register, _globals) {

    runtimeData = _runtimeData;
    intents = _intents;
    register = _register;
    globals = _globals;

    if (globals.Store) {
        return;
    }

    var Store = register.wrapFn(function(object) {

        Object.defineProperties(this,
            C.RESOURCES_ALL.reduce((result, resource) => {
                result[resource] = {
                    value: object.store[resource]||0,
                    enumerable: object.store[resource],
                    configurable: true,
                    writable: true
                };
                return result;
            }, {}));

        Object.defineProperties(this, {
            getCapacity: {
                value: function getCapacity(resource) {
                    if(!resource) {
                        return object.storeCapacityResource ? null : object.storeCapacity || null;
                    }
                    return utils.capacityForResource(object, resource) || null;
                }
            },
            getUsedCapacity: {
                value: function getUsedCapacity(resource) {
                    if(!resource) {
                        if(object.storeCapacityResource) {
                            return null;
                        }
                        if(this._sum === undefined) {
                            this._sum = _.sum(object.store);
                        }
                        return this._sum;
                    }
                    return object.store[resource] || 0;
                }
            },
            getFreeCapacity: {
                value: function getFreeCapacity(resource) {
                    return this.getCapacity(resource) - this.getUsedCapacity(resource);
                }
            },
            toString: {
                value: function toString() {
                    return `[store]`;
                }
            }
        });
    });

    Object.defineProperty(globals, 'Store', {enumerable: true, value: Store});

};
