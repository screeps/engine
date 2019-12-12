const _ =require('lodash'),
    utils =  require('../../../../../src/utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../../../../../src/processor/intents/movement'),
    creepsEnv = require('../../../../helpers/mocks/creeps'),
    intents = require('../../../../helpers/mocks/intents');

describe("Creep transferring resource", () => {
    let lorry1, lorry2;

    beforeEach(()=>{
        lorry1 = creepsEnv.createCreep('lorry', {x: 24, y: 24});
        lorry2 = creepsEnv.createCreep('lorry', {x: 24, y: 25});
        movement.init();
    });

    it("does not transfer it to a creep being spawned",()=>{
        lorry1.store = {energy: 100};
        lorry2.store = {energy:0};
        lorry2.spawning = true;
        lorry1.transfer(lorry2._id, C.RESOURCE_ENERGY, 100);
        intents.ticks();

        expect(lorry1.store.energy).toBe(100);
        expect(lorry2.store.energy).toBe(0);
    });
});
