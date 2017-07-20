var q = require('q'),
    _ = require('lodash'),
    utils = require('../utils'),
    driver = utils.getDriver(),
    C = driver.constants;



module.exports.execute = function(market, gameTime, terminals, bulkObjects) {

    var bulkUsers = driver.bulkUsersWrite(),
        bulkTransactions = driver.bulkTransactionsWrite(),
        bulkUsersMoney = driver.bulkUsersMoney(),
        bulkUsersResources = driver.bulkUsersResources(),
        bulkMarketOrders = driver.bulkMarketOrders();

    var terminalsByRoom = _.indexBy(terminals, 'room');

    function executeTransfer(fromTerminal, toTerminal, resourceType, amount, transferFeeTerminal, additionalFields) {

        additionalFields = additionalFields || {};

        if(!fromTerminal || !toTerminal || !transferFeeTerminal) {
            return false;
        }
        if(fromTerminal.user && (!fromTerminal[resourceType] || fromTerminal[resourceType] < amount)) {
            return false;
        }
        if(toTerminal.user) {
            var targetResourceTotal = utils.calcResources(toTerminal),
                freeSpace = Math.max(0, toTerminal.energyCapacity - targetResourceTotal);
            amount = Math.min(amount, freeSpace);
        }
        if(!(amount > 0)) {
            return;
        }

        var range = utils.calcRoomsDistance(fromTerminal.room, toTerminal.room, true);
        var transferCost = utils.calcTerminalEnergyCost(amount,range);

        if(transferFeeTerminal === fromTerminal &&
            (resourceType != C.RESOURCE_ENERGY && fromTerminal.energy < transferCost ||
             resourceType == C.RESOURCE_ENERGY && fromTerminal.energy < amount + transferCost) ||
           transferFeeTerminal === toTerminal && toTerminal.energy < transferCost) {
            return false;
        }

        if(toTerminal.user) {
            toTerminal[resourceType] = toTerminal[resourceType] || 0;
            toTerminal[resourceType] += amount;
            bulkObjects.update(toTerminal, {[resourceType]: toTerminal[resourceType]});
        }

        bulkObjects.update(fromTerminal, {[resourceType]: fromTerminal[resourceType] - amount});
        bulkObjects.update(transferFeeTerminal, {energy: transferFeeTerminal.energy - transferCost});

        bulkTransactions.insert(_.extend({
            time: +gameTime,
            sender: fromTerminal.user ? ""+fromTerminal.user : undefined,
            recipient: toTerminal.user ? ""+toTerminal.user : undefined,
            resourceType: resourceType,
            amount: amount,
            from: fromTerminal.room,
            to: toTerminal.room
        }, additionalFields));

        return true;
    }

    _.filter(terminals, i => !!i.send).forEach(terminal => {

        var intent = terminal.send;

        bulkObjects.update(terminal, {send: null});

        if(terminal.cooldownTime > gameTime) {
            return;
        }
        if(!terminalsByRoom[intent.targetRoomName] || !terminalsByRoom[intent.targetRoomName].user) {
            return;
        }

        if(executeTransfer(terminal, terminalsByRoom[intent.targetRoomName], intent.resourceType, intent.amount, terminal, {
            description: intent.description ? intent.description.replace(/</g, '&lt;') : undefined
        })) {
            bulkObjects.update(terminal, {cooldownTime: gameTime + C.TERMINAL_COOLDOWN});
        }
    });

    if(market) {

        var usersById = _.indexBy(market.users, '_id'),
            ordersById = _.indexBy(market.orders, '_id'),
            terminalDeals = [], directDeals = [];

        market.intents.forEach(userIntents => {

            var user = usersById[userIntents.user];

            if (userIntents.intents.createOrder) {
                userIntents.intents.createOrder.forEach(intent => {

                    if (!intent.price || !intent.totalAmount) {
                        return;
                    }
                    if(!_.contains(C.RESOURCES_ALL, intent.resourceType) && intent.resourceType != C.SUBSCRIPTION_TOKEN) {
                        return;
                    }
                    if (intent.resourceType != C.SUBSCRIPTION_TOKEN &&
                        (!terminalsByRoom[intent.roomName] || terminalsByRoom[intent.roomName].user != userIntents.user)) {
                        return;
                    }
                    if(intent.price <= 0 || intent.totalAmount <= 0) {
                        return;
                    }

                    var fee = utils.roundCredits(intent.price * intent.totalAmount * C.MARKET_FEE);

                    if (user.money < fee) {
                        return;
                    }

                    bulkUsers.update(user, {money: user.money - fee});

                    bulkMarketOrders.insert(_.extend({
                        created: gameTime,
                        user: userIntents.user,
                        active: false,
                        type: intent.type == C.ORDER_SELL ? C.ORDER_SELL : C.ORDER_BUY,
                        amount: 0,
                        remainingAmount: intent.totalAmount
                    }, intent));

                    bulkUsersMoney.insert({
                        date: new Date(),
                        tick: gameTime,
                        user: userIntents.user,
                        type: 'market.fee',
                        balance: user.money,
                        change: -fee,
                        market: {
                            order: intent
                        }
                    });
                });
            }

            if (userIntents.intents.changeOrderPrice) {
                userIntents.intents.changeOrderPrice.forEach(intent => {
                    var order = ordersById[intent.orderId];
                    if (!order || order.user != userIntents.user) {
                        return;
                    }
                    if (!intent.newPrice || intent.newPrice <= 0) {
                        return;
                    }

                    if(intent.newPrice > order.price) {

                        var fee = utils.roundCredits((intent.newPrice - order.price) * order.remainingAmount * C.MARKET_FEE);

                        if (user.money < fee) {
                            return;
                        }

                        bulkUsers.update(user, {money: user.money - fee});

                        bulkUsersMoney.insert({
                            date: new Date(),
                            tick: gameTime,
                            user: userIntents.user,
                            type: 'market.fee',
                            balance: user.money,
                            change: -fee,
                            market: {
                                changeOrderPrice: {
                                    orderId: intent.orderId,
                                    oldPrice: order.price,
                                    newPrice: intent.newPrice
                                }
                            }
                        });
                    }

                    bulkMarketOrders.update(order._id, {price: intent.newPrice});
                });
            }

            if (userIntents.intents.extendOrder) {
                userIntents.intents.extendOrder.forEach(intent => {
                    var order = ordersById[intent.orderId];
                    if (!order || order.user != userIntents.user) {
                        return;
                    }
                    if (!intent.addAmount || intent.addAmount <= 0) {
                        return;
                    }

                    var fee = utils.roundCredits(order.price * intent.addAmount * C.MARKET_FEE);

                    if (user.money < fee) {
                        return;
                    }

                    bulkUsers.update(user, {money: user.money - fee});

                    bulkUsersMoney.insert({
                        date: new Date(),
                        tick: gameTime,
                        user: userIntents.user,
                        type: 'market.fee',
                        balance: user.money,
                        change: -fee,
                        market: {
                            extendOrder: {
                                orderId: intent.orderId,
                                addAmount: intent.addAmount
                            }
                        }
                    });

                    bulkMarketOrders.update(order, {
                        remainingAmount: order.remainingAmount + intent.addAmount,
                        totalAmount: order.totalAmount + intent.addAmount
                    });
                });
            }


            if (userIntents.intents.cancelOrder) {
                userIntents.intents.cancelOrder.forEach(intent => {
                    if (ordersById[intent.orderId] && ordersById[intent.orderId].user == userIntents.user) {
                        ordersById[intent.orderId].remainingAmount = 0;
                        ordersById[intent.orderId]._cancelled = true;
                        //console.log('Order cancelled ',JSON.stringify(ordersById[intent.orderId]));
                    }
                });
            }

            if (userIntents.intents.deal) {
                userIntents.intents.deal.forEach(intent => {
                    intent.user = userIntents.user;

                    if(!ordersById[intent.orderId]) {
                        return;
                    }
                    if(intent.amount <= 0) {
                        return;
                    }
                    if(ordersById[intent.orderId].resourceType == C.SUBSCRIPTION_TOKEN) {
                        directDeals.push(intent);
                        return;
                    }
                    if(!terminalsByRoom[intent.targetRoomName] || terminalsByRoom[intent.targetRoomName].user != userIntents.user) {
                        return;
                    }
                    terminalDeals.push(intent);
                });
            }
        });

        terminalDeals.sort((a,b) => utils.calcRoomsDistance(a.targetRoomName, ordersById[a.orderId].roomName, true) - utils.calcRoomsDistance(b.targetRoomName, ordersById[b.orderId].roomName, true))

        terminalDeals.forEach(deal => {
            var order = ordersById[deal.orderId],
                orderTerminal = terminalsByRoom[order.roomName],
                targetTerminal = terminalsByRoom[deal.targetRoomName],
                buyer, seller;

            if(!orderTerminal || !targetTerminal) {
                return;
            }
            if(targetTerminal.cooldownTime > gameTime) {
                return;
            }

            if(order.type == C.ORDER_SELL) {
                buyer = targetTerminal;
                seller = orderTerminal;
            }
            else {
                seller = targetTerminal;
                buyer = orderTerminal;
            }

            var amount = Math.min(deal.amount, order.remainingAmount);
            if(seller.user) {
                amount = Math.min(amount, seller[order.resourceType] || 0);
            }
            if(buyer.user) {
                var targetResourceTotal = utils.calcResources(buyer),
                    targetFreeSpace = Math.max(0, buyer.energyCapacity - targetResourceTotal);
                amount = Math.min(amount, targetFreeSpace);
            }
            if(!(amount > 0)) {
                return;
            }

            var dealCost = utils.roundCredits(Math.ceil(amount * order.price * 100) / 100);

            if(buyer.user) {
                dealCost = Math.min(dealCost, usersById[buyer.user].money || 0);
                amount = Math.floor(dealCost/order.price);
                dealCost = utils.roundCredits(Math.ceil(amount * order.price * 100) / 100);
                if(!amount) {
                    return;
                }
            }

            if(executeTransfer(seller, buyer, order.resourceType, amount, targetTerminal, {order: {
                    id: ""+order._id,
                    type: order.type,
                    price: order.price
                }})) {

                if(seller.user) {
                    bulkUsers.update(usersById[seller.user], {money: (usersById[seller.user].money||0) + dealCost});
                    bulkUsersMoney.insert({
                        date: new Date(),
                        tick: gameTime,
                        user: seller.user,
                        type: 'market.sell',
                        balance: usersById[seller.user].money,
                        change: dealCost,
                        market: {
                            resourceType: order.resourceType,
                            roomName: order.roomName,
                            targetRoomName: deal.targetRoomName,
                            price: order.price,
                            npc: !buyer.user,
                            amount
                        }
                    });
                }
                if(buyer.user) {
                    bulkUsers.update(usersById[buyer.user], {money: (usersById[buyer.user].money||0) - dealCost});
                    bulkUsersMoney.insert({
                        date: new Date(),
                        tick: gameTime,
                        user: buyer.user,
                        type: 'market.buy',
                        balance: usersById[buyer.user].money,
                        change: -dealCost,
                        market: {
                            resourceType: order.resourceType,
                            roomName: order.roomName,
                            targetRoomName: deal.targetRoomName,
                            price: order.price,
                            npc: !seller.user,
                            amount
                        }
                    });
                }
                bulkMarketOrders.update(order, {
                    amount: order.amount - amount,
                    remainingAmount: order.remainingAmount - amount
                });
                bulkObjects.update(targetTerminal, {cooldownTime: gameTime + C.TERMINAL_COOLDOWN});
            }
        });

        directDeals = _.shuffle(directDeals);

        directDeals.forEach(deal => {

            var order = ordersById[deal.orderId],
                buyer, seller, userFieldName = 'subscriptionTokens';

            if(order.type == C.ORDER_SELL) {
                buyer = usersById[deal.user];
                seller = usersById[order.user];
            }
            else {
                seller = usersById[deal.user];
                buyer = usersById[order.user];
            }

            if(!seller || !buyer) {
                return;
            }

            var amount = Math.min(deal.amount, order.remainingAmount);
            if(seller.user) {
                amount = Math.min(amount, seller[userFieldName] || 0);
            }
            if(!amount) {
                return;
            }

            var dealCost = utils.roundCredits(amount * order.price);

            if(buyer.user && (!buyer.money || buyer.money < dealCost)) {
                return;
            }




            bulkUsers.update(seller, {
                money: (seller.money||0) + dealCost,
                [userFieldName]: (seller[userFieldName]||0) - amount
            });
            bulkUsersMoney.insert({
                date: new Date(),
                tick: gameTime,
                user: ""+seller._id,
                type: 'market.sell',
                balance: seller.money,
                change: dealCost,
                market: {
                    resourceType: order.resourceType,
                    price: order.price,
                    amount
                }
            });
            bulkUsersResources.insert({
                date: new Date(),
                resourceType: order.resourceType,
                user: ""+seller._id,
                change: -amount,
                balance: seller[userFieldName],
                marketOrderId: ""+order._id,
                market: {
                    orderId: ""+order._id,
                    anotherUser: ""+buyer._id
                }
            });

            bulkUsers.update(buyer, {
                money: (buyer.money||0) - dealCost,
                [userFieldName]: (buyer[userFieldName]||0) + amount
            });
            bulkUsersMoney.insert({
                date: new Date(),
                tick: gameTime,
                user: ""+buyer._id,
                type: 'market.buy',
                balance: buyer.money,
                change: -dealCost,
                market: {
                    resourceType: order.resourceType,
                    price: order.price,
                    amount
                }
            });
            bulkMarketOrders.update(order, {
                amount: order.amount - amount,
                remainingAmount: order.remainingAmount - amount
            });
            bulkUsersResources.insert({
                date: new Date(),
                resourceType: order.resourceType,
                user: ""+buyer._id,
                change: amount,
                balance: buyer[userFieldName],
                market: {
                    orderId: ""+order._id,
                    anotherUser: ""+seller._id
                }
            });
        });

        market.orders.forEach(order => {

            if (order._cancelled) {
                bulkMarketOrders.remove(order._id);
                return;
            }

            if(!order.user) {
                return;
            }

            var terminal = terminalsByRoom[order.roomName];

            if (order.type == C.ORDER_SELL) {

                var availableResourceAmount = order.resourceType == C.SUBSCRIPTION_TOKEN ?
                    (usersById[order.user].subscriptionTokens || 0) :
                    terminal && terminal.user == order.user ? terminal[order.resourceType] || 0 : 0;

                availableResourceAmount = Math.min(availableResourceAmount, order.remainingAmount);

                if (order.active) {
                    if (!availableResourceAmount) {
                        bulkMarketOrders.update(order, {active: false, amount: 0});
                        return;
                    }
                    if (order.amount != availableResourceAmount) {
                        bulkMarketOrders.update(order, {amount: availableResourceAmount});
                    }
                }
                else {
                    if (availableResourceAmount > 0) {
                        bulkMarketOrders.update(order, {
                            active: true,
                            amount: availableResourceAmount
                        });
                    }
                }
            }

            if (order.type == C.ORDER_BUY) {

                var user = usersById[order.user], userMoney = user.money || 0;
                var isOwner = order.resourceType == C.SUBSCRIPTION_TOKEN || (!!terminal && terminal.user == order.user);

                var newAmount = Math.min(Math.floor(userMoney / order.price), order.remainingAmount);
                if(terminal && terminal.user) {
                    var targetResourceTotal = utils.calcResources(terminal),
                        targetFreeSpace = Math.max(0, terminal.energyCapacity - targetResourceTotal);
                    newAmount = Math.min(newAmount, targetFreeSpace);
                }

                var newActive = isOwner && newAmount > 0;

                if (order.amount != newAmount || order.active != newActive) {
                    bulkMarketOrders.update(order, {amount: newAmount, active: newActive});
                }
            }
        });
    }

    return q.all([
        bulkUsers.execute(),
        bulkMarketOrders.execute(),
        bulkUsersMoney.execute(),
        bulkTransactions.execute(),
        bulkUsersResources.execute(),
        driver.clearMarketIntents()
    ]);
};