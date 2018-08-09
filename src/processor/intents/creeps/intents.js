var _ = require('lodash');

var priorities = {
    rangedHeal: ['heal'],
    attackController: ['rangedHeal', 'heal'],
    dismantle: ['attackController','rangedHeal','heal'],
    repair: ['dismantle','attackController','rangedHeal','heal'],
    build: ['repair','dismantle','attackController','rangedHeal','heal'],
    attack: ['build','repair','dismantle','attackController','rangedHeal','heal'],
    harvest: ['attack','build','repair','dismantle','attackController','rangedHeal','heal'],
    rangedMassAttack: ['build','repair','rangedHeal'],
    rangedAttack: ['rangedMassAttack','build','repair','rangedHeal']
};

var creepActions = ['drop','transfer','withdraw','pickup','heal','rangedHeal','dismantle','attack','harvest','move','repair',
    'build','rangedMassAttack','rangedAttack','say','suicide','claimController','upgradeController','reserveController',
    'attackController','generateSafeMode','signController'];

var modules = require('bulk-require')(__dirname, ['*.js']);

function checkPriorities(intents, name) {
    return intents[name] && (!priorities[name] || !_.any(priorities[name], i => !!intents[i]));
}

module.exports = function(object, objectIntents, scope) {
    creepActions.forEach(name => {
        if(checkPriorities(objectIntents, name)) {
            modules[name](object, objectIntents[name], scope);
        }
    });
};
