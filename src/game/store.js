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

        Object.entries(object.store).forEach(([resourceType, resourceAmount]) => {
            if(resourceAmount) {
                this[resourceType] = resourceAmount;
            }
        });

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
                        if(!!object.storeCapacityResource && (utils.capacityForResource(object, resource) === 0)) {
                            return null;
                        }
                        if(this._sum === undefined) {
                            Object.defineProperty(this, '_sum', {
                                value: _.sum(object.store)
                            });
                        }
                        return this._sum;
                    }
                    return object.store[resource] || (!!object.storeCapacityResource && utils.capacityForResource(object, resource) === 0 ? null : 0);
                }
            },
            getFreeCapacity: {
                value: function getFreeCapacity(resource) {
                    if(utils.capacityForResource(object, resource) === 0) {
                        return null;
                    }

                    if(!object.storeCapacity) {
                        return this.getCapacity(resource) - this.getUsedCapacity(resource);
                    }

                    const capacity = this.getCapacity(resource);
                    if(!capacity) {
                        return null;
                    }

                    if(this._sum === undefined) {
                        Object.defineProperty(this, '_sum', {
                            value: _.sum(object.store)
                        });
                    }

                    return capacity - this._sum;
                }
            },
            toString: {
                value: function toString() {
                    return `[store]`;
                }
            }
        });

        return new Proxy(this, {
            get(target, name) {
                if(target[name] !== undefined) {
                    return target[name];
                }
                if(C.RESOURCES_ALL.indexOf(name) !== -1) {
                    return 0;
                }
            }
        });
    });

    Object.defineProperty(globals, 'Store', {enumerable: true, value: Store});

};
