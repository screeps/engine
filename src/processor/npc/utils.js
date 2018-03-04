const _ = require('lodash');
const utils = require('../../utils');

const abs = Math.abs;
const max = Math.max;

module.exports = {
    inRangeTo(xOrigin, yOrigin, range) {
        return ({x, y}) => module.exports.getRangeTo({
            x: xOrigin,
            y: yOrigin,
        }, {
            x,
            y,
        }) <= range;
    },
    getRangeTo({ x: xOrigin, y: yOrigin }, { x, y }) {
        return max(abs(xOrigin - x), abs(yOrigin - y));
    },
    isNearTo({ x: xOrigin, y: yOrigin }, { x, y }) {
        return module.exports.getRangeTo({
            x: xOrigin,
            y: yOrigin,
        }, {
            x,
            y,
        }) === 1;
    },
    getDirectionByPath(creep, path) {
        const { x: curX, y: curY } = creep;
        const index = _.findIndex(path, ([x, y]) => x === curX && y === curY);
        if (index === -1) {
            return;
        }
        if (index === path.length - 1) {
            return;
        }
        const [nextX, nextY] = path[index + 1];
        return utils.getDirection(nextX - curX, nextY - curY);
    }
};