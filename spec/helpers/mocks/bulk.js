const _ = require('lodash'),
    common = require('./common');

let objects = {};

exports.update = (id, data) => {
    data = _.cloneDeep(data);

    _.forEach(data, (value, key) => {
        if(_.isObject(value)) {
            if (!_.isObject(id)) {
                throw new Error(`can not update an object diff property '${key}' without object reference`);
            }
            const originalValue = id[key] || {};
            _.merge(originalValue, value);
            data[key] = originalValue;
        }
    });
    if(_.isObject(id)) {
        _.merge(id, data);
    } else {
        const object = objects[id];
        if(!object) {
            throw new Error(`${id} is not registered in bulk fake`);
        }
        _.merge(object, data);
    }
};

exports.remove = id => {
    if(!objects[id]) {
        throw new Error(`${id} is not registered in bulk fake`);
    }
    delete objects[id];
};

exports.insert = object => {
    if(!object._id) {
        object._id = common.generateId();
    }
    objects[object._id] = object;
};

exports.reset = () => {objects = {};};
