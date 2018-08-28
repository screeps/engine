"use strict";
let _ = require('lodash');
let kObstacle = Infinity;
let utils = require('../utils');
let driver = utils.getRuntimeDriver();
let C = driver.constants;

exports.make = function(runtimeData, intents, register, globals) {

    driver.pathFinder.make(runtimeData, intents, register, globals);

    if(globals.PathFinder) {
        return;
    }

    //
    // 2d array of costs for pathfinding
    var CostMatrix = register.wrapFn(function() {
        this._bits = new Uint8Array(2500);
    });

    CostMatrix.prototype.set = register.wrapFn(function(xx, yy, val) {
        xx = xx|0;
        yy = yy|0;
        this._bits[xx * 50 + yy] = Math.min(Math.max(0, val), 255);
    });

    CostMatrix.prototype.get = register.wrapFn(function(xx, yy) {
        xx = xx|0;
        yy = yy|0;
        return this._bits[xx * 50 + yy];
    });

    CostMatrix.prototype.clone = register.wrapFn(function() {
        var newMatrix = new CostMatrix;
        newMatrix._bits = new Uint8Array(this._bits);
        return newMatrix;
    });

    CostMatrix.prototype.serialize = register.wrapFn(function() {
        return Array.prototype.slice.apply(new Uint32Array(this._bits.buffer));
    });

    CostMatrix.deserialize = register.wrapFn(function(data) {
        let instance = Object.create(CostMatrix.prototype);
        instance._bits = new Uint8Array(new Uint32Array(data).buffer);
        return instance;
    });

    var PathFinder = Object.create(Object.prototype, {

        CostMatrix: {
            enumerable: true,
            value: CostMatrix
        },

        search: {
            enumerable: true,
            value: register.wrapFn(function (origin, goal, options) {
                if (!goal || Array.isArray(goal) && !goal.length) {
                    return {path: [], ops: 0};
                }
                return driver.pathFinder.search(origin, goal, options);
            })
        },

        use: {
            enumerable: true,
            value: register.wrapFn(function (isActive) {
                if (!isActive) {
                    register.deprecated('`PathFinder.use` is considered deprecated and will be removed soon.');
                }
                register._useNewPathFinder = !!isActive;
            })
        }
    });

    Object.defineProperty(globals, 'PathFinder', {enumerable: true, value: PathFinder});

};
