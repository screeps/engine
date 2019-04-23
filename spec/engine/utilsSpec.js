const _ = require('lodash'),
    utils =  require('../../src/utils');

describe('Utils', () => {
    beforeEach(()=>{
    });

    it('Should cost something to send resources',()=>{
        expect(utils.calcTerminalEnergyCost(1, 1)).toBeGreaterThan(0);
    });

    it('Should not cost something to not send resources',()=>{
        expect(utils.calcTerminalEnergyCost(10, 0)).toBe(0);
    });
});
