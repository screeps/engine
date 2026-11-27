const utils = require('../../../src/utils'),
    driver = utils.getDriver(),
    game = require('../../../src/game/game');

describe('Code modules', () => {
    let originalEvalCode;

    beforeEach(() => {
        originalEvalCode = driver.evalCode;
        driver.evalCode = (module, globals) => {
            const factory = new Function('module', 'exports', 'require', 'global', module.code);
            factory(module, module.exports, globals.require, globals);
        };
    });

    afterEach(() => {
        driver.evalCode = originalEvalCode;
    });

    function runModule(moduleName, includeModule = true) {
        const userId = `module-test-${moduleName}-${includeModule}`;
        const globals = {};
        const runtimeData = {
            user: {_id: userId, gcl: 0, power: 0, cpu: 20, resources: {}},
            userObjects: {},
            userPowerCreeps: {},
            roomObjects: {},
            rooms: {},
            flags: [],
            time: 1,
            cpu: 20,
            cpuBucket: 10000,
            accessibleRooms: '[]',
            staticTerrainData: {W0N0: new Uint8Array(2500)},
            roomStatusData: {},
            mapGrid: {gridData: {}},
            transactions: {incoming: [], outgoing: []},
            market: {orders: {}, history: {}},
            userCodeTimestamp: 1
        };
        const codeModules = JSON.parse(JSON.stringify({
            main: `module.exports.loop = () => { global.result = require(${JSON.stringify(moduleName)}); }`
        }));
        if(includeModule) {
            Object.defineProperty(codeModules, moduleName, {
                value: 'module.exports = 42',
                enumerable: true
            });
        }

        game.init(
            globals, codeModules, runtimeData, {push() {}}, {get() { return '{}'; }},
            {log() {}, commandResult() {}}, [], 100, () => 0, undefined, fn => fn
        );
        game.run(userId);

        return globals.result;
    }

    ['constructor', 'toString', '__proto__'].forEach(moduleName => {
        it(`loads a module named ${moduleName}`, () => {
            expect(runModule(moduleName)).toBe(42);
        });
    });

    it('rejects an unknown module whose name is inherited from Object.prototype', () => {
        expect(() => runModule('constructor', false)).toThrowError("Unknown module 'constructor'");
    });
});
