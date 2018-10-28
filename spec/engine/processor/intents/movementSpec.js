const _ =require('lodash'),
    utils =  require('../../../../src/utils'),
    driver = utils.getDriver(),
    C = driver.constants,
    movement = require('../../../../src/processor/intents/movement'),
    roomsEnv = require('../../../helpers/mocks/rooms'),
    creepsEnv = require('../../../helpers/mocks/creeps'),
    intents = require('../../../helpers/mocks/intents');

describe('movement', ()=>{
    let scope;

    beforeEach(()=>{
        scope = intents.scope;
        intents.reset();
    });

    describe('One creep', ()=>{
        let noMove, damaged;
        beforeEach(()=>{
            noMove = creepsEnv.createCreep('noMove', {x: 24, y: 24});
            damaged = creepsEnv.createCreep('fullSpeed', {x: 23, y: 28});
            _.forEach(damaged.body, i => {if(i.type == C.MOVE) i.hits = 0});
            movement.init(scope.roomObjects, roomsEnv.terrain.E2S7);
        });

        it('does not move without MOVE parts',()=>{
            noMove.move(7);
            movement.check(false);
            intents.ticks();

            expect(noMove.x).toBe(24); expect(noMove.y).toBe(24);
        });

        it('does not move with all MOVE parts dead',()=>{
            damaged.move(1);
            movement.check(false);
            intents.ticks();

            expect(damaged.x).toBe(23); expect(damaged.y).toBe(28);
        });

        describe('Offroad creep', ()=>{
            let scout, scout2;
            beforeEach(()=>{
                scout = creepsEnv.createCreep('scout', {x: 24, y: 24});
                scout2 = creepsEnv.createCreep('scout', {x: 24, y: 25});
                movement.init(scope.roomObjects, roomsEnv.terrain.E2S7);
            });

            it("moves over plain",()=>{
                scout.move(7);
                movement.check(false);
                intents.ticks();

                expect(scout.x).toBe(23); expect(scout.y).toBe(24); expect(scout.fatigue).toBe(0);
            });

            it("does not move into wall",()=>{
                scout.move(4);
                movement.check(false);
                intents.ticks();

                expect(scout.x).toBe(24); expect(scout.y).toBe(24); expect(scout.fatigue).toBe(0);
            });

            it("does not move into another creep",()=>{
                scout.move(5);
                movement.check(false);
                intents.ticks();

                expect(scout.x).toBe(24); expect(scout.y).toBe(24); expect(scout.fatigue).toBe(0);
                expect(scout2.x).toBe(24); expect(scout2.y).toBe(25); expect(scout2.fatigue).toBe(0);
            });
        });

        describe('Full speed creep',()=>{
            let creep;
            beforeEach(()=>{
                creep = creepsEnv.createCreep('fullSpeed', {x: 24, y: 24});
                movement.init(scope.roomObjects, roomsEnv.terrain.E2S7);
            });

            it("does not move when tired",()=>{
                creep.fatigue = 1;
                creep.move(2);
                movement.check(false);
                intents.ticks();

                expect(creep.x).toBe(24); expect(creep.y).toBe(24);
                expect(creep.fatigue).toBe(0); // rested this tick
            });

            it("is not tired after moving over plain tile",()=>{
                creep.move(2);
                movement.check(false);
                intents.ticks();

                expect(creep.x).toBe(25); expect(creep.y).toBe(23); expect(creep.fatigue).toBe(0);
            });

            it("is tired after moving over swamp tile ",()=>{
                creep.move(3);
                movement.check(false);
                intents.ticks();

                expect(creep.x).toBe(25); expect(creep.y).toBe(24); expect(creep.fatigue).toBe(8);
            });
        });

        describe('Half speed creep',()=>{
            let creep;
            beforeEach(()=>{
                creep = creepsEnv.createCreep('halfSpeed', {x: 24, y: 24});
                movement.init([creep,{type: 'road', x: 23, y: 24}], roomsEnv.terrain.E2S7);
            });

            it("is tired after moving over plain tile",()=>{
                creep.move(2);
                movement.check(false);
                intents.ticks();

                expect(creep.x).toBe(25); expect(creep.y).toBe(23); expect(creep.fatigue).toBe(2);
            });

            it("is tired after moving over swamp tile",()=>{
                creep.move(3);
                movement.check(false);
                intents.ticks();

                expect(creep.x).toBe(25); expect(creep.y).toBe(24); expect(creep.fatigue).toBe(18);
            });

            it("is not tired after moving over road",()=>{
                creep.move(7);
                movement.check(false);
                intents.ticks();

                expect(creep.x).toBe(23); expect(creep.y).toBe(24); expect(creep.fatigue).toBe(0);
            });
        });
    });

    describe('Two creeps', ()=>{
        let scout1, scout2;
        beforeEach(()=>{
            scout1 = creepsEnv.createCreep('scout', {x: 24, y: 24});
            scout2 = creepsEnv.createCreep('scout', {x: 24, y: 25});
            movement.init(scope.roomObjects, roomsEnv.terrain.E2S7);
        });

        it("should follow step-to-step",()=>{
            scout1.move(5);
            scout2.move(5);
            movement.check(false);
            intents.ticks();

            expect(scout1.x).toBe(24); expect(scout1.y).toBe(25);
            expect(scout2.x).toBe(24); expect(scout2.y).toBe(26);
        });

        it("should swap positions",()=>{
            scout1.move(5);
            scout2.move(1);
            movement.check(false);
            intents.ticks();

            expect(scout1.x).toBe(24); expect(scout1.y).toBe(25);
            expect(scout2.x).toBe(24); expect(scout2.y).toBe(24);
        });
    });

    describe('When several creeps trying to move onto the same tile',()=>{
        let fullSpeed1, fullSpeed2, halfSpeed1, halfSpeed2;

        beforeEach(()=>{
            fullSpeed1 = creepsEnv.createCreep('fullSpeed', {x: 24, y: 24});
            fullSpeed2 = creepsEnv.createCreep('fullSpeed', {x: 23, y: 26});
            halfSpeed1 = creepsEnv.createCreep('halfSpeed', {x: 24, y: 25});
            halfSpeed2 = creepsEnv.createCreep('halfSpeed', {x: 24, y: 26});
            movement.init([fullSpeed1, halfSpeed1, halfSpeed2], roomsEnv.terrain.E2S7);
        });

        it('creep with best moves/weight ratio takes priority',()=>{
            fullSpeed1.move(6);
            halfSpeed1.move(7);
            movement.check(false);
            intents.ticks();

            expect(fullSpeed1.x).toBe(23); expect(fullSpeed1.y).toBe(25);
            expect(halfSpeed1.x).toBe(24); expect(halfSpeed1.y).toBe(25);
        });

        it('creep having follower takes priority',()=>{
            fullSpeed1.move(6);
            halfSpeed1.move(7);
            halfSpeed2.move(1);
            movement.check(false);
            intents.ticks();

            expect(fullSpeed1.x).toBe(24); expect(fullSpeed1.y).toBe(24);
            expect(halfSpeed1.x).toBe(23); expect(halfSpeed1.y).toBe(25);
        });

        it('creep that pulls someone takes priority',()=>{
            halfSpeed1.move(7);
            halfSpeed1.pull(fullSpeed1._id);
            fullSpeed1.move(halfSpeed1._id);
            fullSpeed2.move(1);
            halfSpeed2.move(7);
            movement.check(false);
            intents.ticks();

            expect(fullSpeed2.x).toBe(23); expect(fullSpeed2.y).toBe(26);
            expect(halfSpeed1.x).toBe(23); expect(halfSpeed1.y).toBe(25);
        });

        it('creep that being pulled takes priority',()=>{
            halfSpeed1.move(7);
            halfSpeed1.pull(halfSpeed2._id);
            halfSpeed2.move(halfSpeed1._id);
            fullSpeed1.move(5);
            movement.check(false);
            intents.ticks();

            expect(halfSpeed2.x).toBe(24); expect(halfSpeed2.y).toBe(25);
            expect(fullSpeed1.x).toBe(24); expect(fullSpeed1.y).toBe(24);
        });
    });

    describe('Creep pulling another creep',()=>{
        let fullSpeed, halfSpeed, halfSpeed2, noMove;
        beforeEach(()=>{
            noMove = creepsEnv.createCreep('noMove', {x: 23, y: 25});
            halfSpeed = creepsEnv.createCreep('halfSpeed', {x: 24, y: 24});
            halfSpeed2 = creepsEnv.createCreep('halfSpeed', {x: 25, y: 23});
            fullSpeed = creepsEnv.createCreep('fullSpeed', {x: 24, y: 25});
            movement.init(scope.roomObjects, roomsEnv.terrain.E2S7);
        });

        it("must have MOVE part(s)",()=>{
            noMove.pull(halfSpeed._id);
            noMove.move(halfSpeed._id);
            halfSpeed.move(noMove._id);
            movement.check(false);
            intents.ticks();

            expect(noMove.x).toBe(23); expect(noMove.y).toBe(25);
            expect(halfSpeed.x).toBe(24); expect(halfSpeed.y).toBe(24);
        });

        it("receives another creep's fatigue if he follows (direction syntax)",()=>{
            fullSpeed.move(5);
            fullSpeed.pull(halfSpeed._id);
            halfSpeed.move(5);
            movement.check(false);
            intents.ticks();

            expect(fullSpeed.x).toBe(24); expect(fullSpeed.y).toBe(26);
            expect(halfSpeed.x).toBe(24); expect(halfSpeed.y).toBe(25);
            expect(halfSpeed.fatigue).toBe(0);
            expect(fullSpeed.fatigue).toBe(4); // he carries 1 his own tough plus 2 tough of halfSpeed using 1 his move part
        });

        it("receives another creep's fatigue if he follows (creep syntax)",()=>{
            fullSpeed.move(5);
            fullSpeed.pull(halfSpeed._id);
            halfSpeed.move(fullSpeed._id);
            movement.check(false);
            intents.ticks();

            expect(fullSpeed.x).toBe(24); expect(fullSpeed.y).toBe(26);
            expect(halfSpeed.x).toBe(24); expect(halfSpeed.y).toBe(25);
            expect(halfSpeed.fatigue).toBe(0);
            expect(fullSpeed.fatigue).toBe(4); // he carries 1 his own tough plus 2 tough of halfSpeed using 1 his move part
        });

        it("does not receive another creep's fatigue if he does not follow",()=>{
            fullSpeed.move(5);
            fullSpeed.pull(halfSpeed._id);
            halfSpeed.move(8);
            movement.check(false);
            intents.ticks();

            expect(fullSpeed.x).toBe(24); expect(fullSpeed.y).toBe(26);
            expect(halfSpeed.x).toBe(23); expect(halfSpeed.y).toBe(23);
            expect(halfSpeed.fatigue).toBe(2);
            expect(fullSpeed.fatigue).toBe(0);
        });

        it("moves a creep without MOVE parts",()=>{
            fullSpeed.move(8);
            fullSpeed.pull(noMove._id);
            noMove.move(fullSpeed._id);
            movement.check(false);
            intents.ticks();

            expect(fullSpeed.x).toBe(23); expect(fullSpeed.y).toBe(24);
            expect(noMove.x).toBe(24); expect(noMove.y).toBe(25);
            expect(noMove.fatigue).toBe(0);
            expect(fullSpeed.fatigue).toBeGreaterThan(0);
        });

        it("prevents circular/sequental pulls (2 creeps)",()=>{
            halfSpeed.move(2);
            halfSpeed.pull(halfSpeed2._id);
            halfSpeed2.move(6);
            halfSpeed2.pull(halfSpeed._id);
            movement.check(false);
            intents.ticks();

            expect(halfSpeed.x).toBe(25); expect(halfSpeed.y).toBe(23);
            expect(halfSpeed2.x).toBe(24); expect(halfSpeed2.y).toBe(24);

            // in this case, one and only one pull should succeeded, either of them, so expectations changed to:
            expect(halfSpeed.fatigue*halfSpeed2.fatigue).toBe(0); // at least one of fatigues should be 0
            expect(halfSpeed.fatigue+halfSpeed2.fatigue).toBeGreaterThan(0); // and the other shouldn't be 0
        });
    });

    describe('Creep pulling chain of creeps',()=>{
        beforeEach(()=>{
            halfSpeed = creepsEnv.createCreep('halfSpeed', {x: 24, y: 24});
            halfSpeed2 = creepsEnv.createCreep('halfSpeed', {x: 25, y: 23});
            noMove = creepsEnv.createCreep('noMove', {x: 23, y: 25});
            fullSpeed = creepsEnv.createCreep('fullSpeed', {x: 24, y: 25});
            movement.init(scope.roomObjects, roomsEnv.terrain.E2S7);
        });

        it('should receive fatigue for all of them',()=>{
            fullSpeed.move(5);
            fullSpeed.pull(halfSpeed._id);
            halfSpeed.move(fullSpeed._id);
            halfSpeed.pull(halfSpeed2._id);
            halfSpeed2.move(halfSpeed._id);
            movement.check(false);
            intents.ticks();

            expect(fullSpeed.x).toBe(24); expect(fullSpeed.y).toBe(26);
            expect(halfSpeed.x).toBe(24); expect(halfSpeed.y).toBe(25);
            expect(halfSpeed2.x).toBe(24); expect(halfSpeed2.y).toBe(24);
            expect(fullSpeed.fatigue).toBe(8); // he carries 1 his own tough plus 2 tough of halfSpeed using 1 his move part
            expect(halfSpeed.fatigue).toBe(0);
            expect(halfSpeed2.fatigue).toBe(0);
        });
    });
});
