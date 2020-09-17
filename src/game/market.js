var _ = require('lodash'),
    utils = require('../utils'),
    driver = utils.getRuntimeDriver(),
    C = driver.constants,
    util = require('util');


exports.make = function(runtimeData, intents, register) {

    var ordersCreatedDuringTick = 0, cachedOrders = {}, cachedHistory = {},
        _incomingTransactions, _outgoingTransactions, _orders;

    function _getOrders(resourceType) {
        if(!resourceType) {
            resourceType = 'all';
        }
        if(!cachedOrders[resourceType]) {
            if(resourceType != 'all' && !_.contains(C.RESOURCES_ALL, resourceType) && !_.contains(C.INTERSHARD_RESOURCES, resourceType)) {
                return {};
            }
            cachedOrders[resourceType] = JSON.parse(JSON.stringify(runtimeData.market.orders[resourceType]) || '{}');
            for(var i in cachedOrders[resourceType]) {
                cachedOrders[resourceType][i].price /= 1000;
            }
        }
        return cachedOrders[resourceType];
    }

    var market = {

        calcTransactionCost: register.wrapFn(function(amount, roomName1, roomName2) {
            var distance = utils.calcRoomsDistance(roomName1, roomName2, true);
            return utils.calcTerminalEnergyCost(amount, distance);
        }),

        getAllOrders: register.wrapFn(function(filter) {
            var orders = _getOrders(filter && filter.resourceType);
            return _.filter(orders, filter);
        }),

        getHistory: register.wrapFn(function(resourceType) {
            if(!resourceType) {
                resourceType = 'all';
            }

            if(!cachedHistory[resourceType]) {
                if(resourceType != 'all' && !_.contains(C.RESOURCES_ALL, resourceType) && !_.contains(C.INTERSHARD_RESOURCES, resourceType)) {
                    return {};
                }
                cachedHistory[resourceType] = JSON.parse(JSON.stringify(runtimeData.market.history[resourceType] || {}));
            }
            return cachedHistory[resourceType];
        }),

        getOrderById: register.wrapFn(function(id) {
            if(this.orders[id]) {
                return JSON.parse(JSON.stringify(this.orders[id]));
            }
            const order = runtimeData.market.orders.all[id];
            if(order) {
                const result = JSON.parse(JSON.stringify(order));
                result.price /= 1000;
                return result;
            }
            return null;
        }),

        createOrder: register.wrapFn(function(type, resourceType, price, totalAmount, roomName) {
            if(_.isObject(type)) {
                var {type, resourceType, price, totalAmount, roomName} = type;
            }
            if(!_.contains(C.RESOURCES_ALL, resourceType) && !_.contains(C.INTERSHARD_RESOURCES, resourceType)) {
                return C.ERR_INVALID_ARGS;
            }
            if(type != C.ORDER_BUY && type != C.ORDER_SELL) {
                return C.ERR_INVALID_ARGS;
            }
            price = parseFloat(price);
            totalAmount = parseInt(totalAmount);
            if(!price || price <= 0 || !totalAmount) {
                return C.ERR_INVALID_ARGS;
            }
            if(price * totalAmount * C.MARKET_FEE > this.credits) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }
            if(!_.contains(C.INTERSHARD_RESOURCES, resourceType) &&
                (!roomName || !_.any(runtimeData.userObjects, {type: 'terminal', room: roomName}))) {
                return C.ERR_NOT_OWNER;
            }
            if(_.size(this.orders) + ordersCreatedDuringTick >= C.MARKET_MAX_ORDERS) {
                return C.ERR_FULL;
            }
            ordersCreatedDuringTick++;
            intents.pushByName('global', 'createOrder', {
                type, resourceType, price, totalAmount, roomName
            });
            return C.OK;
        }),

        cancelOrder: register.wrapFn(function(orderId) {
            if(!this.orders[orderId]) {
                return C.ERR_INVALID_ARGS;
            }
            intents.pushByName('global', 'cancelOrder', {orderId}, 50);
            return C.OK;
        }),

        deal: register.wrapFn(function(orderId, amount, targetRoomName) {
            var order = runtimeData.market.orders.all[orderId];
            if(!order) {
                return C.ERR_INVALID_ARGS;
            }
            amount = parseInt(amount);
            if(!amount || amount < 0) {
                return C.ERR_INVALID_ARGS;
            }
            if(_.contains(C.INTERSHARD_RESOURCES, order.resourceType)) {
                if(order.type == C.ORDER_BUY && (runtimeData.user.resources[order.resourceType]||0) < amount) {
                    return C.ERR_NOT_ENOUGH_RESOURCES;
                }
            }
            else {
                if(!targetRoomName) {
                    return C.ERR_INVALID_ARGS;
                }
                var terminal = _.find(runtimeData.userObjects, {type: 'terminal', room: targetRoomName}),
                    transferCost = this.calcTransactionCost(amount, targetRoomName, order.roomName);
                if(!terminal) {
                    return C.ERR_NOT_OWNER;
                }
                if(!terminal.store || terminal.store[C.RESOURCE_ENERGY] < transferCost) {
                    return C.ERR_NOT_ENOUGH_RESOURCES;
                }
                if(terminal.cooldownTime > runtimeData.time) {
                    return C.ERR_TIRED;
                }
                if(order.type == C.ORDER_BUY) {
                    if(order.resourceType != C.RESOURCE_ENERGY && (!terminal.store[order.resourceType] || terminal.store[order.resourceType] < amount) ||
                         order.resourceType == C.RESOURCE_ENERGY && terminal.store[C.RESOURCE_ENERGY] < amount + transferCost) {
                        return C.ERR_NOT_ENOUGH_RESOURCES;
                    }
                }
            }

            if(order.type == C.ORDER_SELL && (runtimeData.user.money || 0) < amount * order.price) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }

            if(!intents.pushByName('global', 'deal', {orderId, targetRoomName, amount}, 10)) {
                return C.ERR_FULL;
            }
            return C.OK;
        }),

        changeOrderPrice: register.wrapFn(function(orderId, newPrice) {
            var order = this.orders[orderId];
            if(!order) {
                return C.ERR_INVALID_ARGS;
            }
            newPrice = parseFloat(newPrice);
            if(!newPrice || newPrice <= 0) {
                return C.ERR_INVALID_ARGS;
            }
            if(newPrice > order.price && (newPrice - order.price) * order.remainingAmount * C.MARKET_FEE > this.credits) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }

            intents.pushByName('global', 'changeOrderPrice', {
                orderId, newPrice
            }, 50);
            return C.OK;
        }),

        extendOrder: register.wrapFn(function(orderId, addAmount) {
            var order = this.orders[orderId];
            if(!order) {
                return C.ERR_INVALID_ARGS;
            }
            addAmount = parseInt(addAmount);
            if(!addAmount || addAmount <= 0) {
                return C.ERR_INVALID_ARGS;
            }
            if(order.price * addAmount * C.MARKET_FEE > this.credits) {
                return C.ERR_NOT_ENOUGH_RESOURCES;
            }

            intents.pushByName('global', 'extendOrder', {
                orderId, addAmount
            }, 50);
            return C.OK;
        }),
    };

    Object.defineProperties(market, {

        credits: {
            enumerable: true,
            get() {
                return (runtimeData.user.money || 0)/1000;
            }
        },

        incomingTransactions: {
            enumerable: true,
            get() {
                if(!_incomingTransactions) {
                    _incomingTransactions = _.map(runtimeData.transactions.incoming || [], i => {
                        i.transactionId = "" + i._id;
                        delete i._id;
                        i.sender = i.sender ? {username: runtimeData.users[i.sender].username} : undefined;
                        i.recipient = i.recipient ? {username: runtimeData.users[i.recipient].username} : undefined;
                        return i;
                    });
                }
                return _incomingTransactions;
            }
        },

        outgoingTransactions: {
            enumerable: true,
            get() {
                if(!_outgoingTransactions) {
                    _outgoingTransactions = _.map(runtimeData.transactions.outgoing || [], i => {
                        i.transactionId = ""+i._id;
                        delete i._id;
                        i.sender = i.sender ? {username: runtimeData.users[i.sender].username} : undefined;
                        i.recipient = i.recipient ? {username: runtimeData.users[i.recipient].username} : undefined;
                        return i;
                    });
                }
                return _outgoingTransactions;
            }
        },

        orders: {
            enumerable: true,
            get() {
                if(!_orders) {
                    _orders = _(runtimeData.market.myOrders).map(i => {
                        i.id = ""+i._id;
                        delete i._id;
                        delete i.user;
                        i.price /= 1000;
                        return i;
                    }).indexBy('id').value();
                }
                return _orders;
            }
        }
    });

    return market;
};
