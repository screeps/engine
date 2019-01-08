var _ = require('lodash');

var creepActions = ['move','usePower','withdraw','transfer','say','withdraw','transfer','drop','pickup','enableRoom'];

var modules = require('bulk-require')(__dirname, ['*.js']);

module.exports = function(object, objectIntents, scope) {
    creepActions.forEach(name => {
        if(objectIntents[name]) {
            modules[name](object, objectIntents[name], scope);
        }
    });
};
