var utils = require('../utils'),
    driver = utils.getRuntimeDriver(),
    C = driver.constants,
    _ = require('lodash'),
    pathUtils = require('./path-utils'),
    Heap = pathUtils.Heap,
    OpenClosed = pathUtils.OpenClosed;

const kRouteGrid = 30;

exports.makeMap = function(runtimeData, register) {

    var heap, openClosed, parents;
    var originX, originY;
    var toX, toY;

    function describeExits(roomName) {
        if(!/^(W|E)\d+(N|S)\d+$/.test(roomName)) {
            return null;
        }
        var [x,y] = utils.roomNameToXY(roomName);
        var gridItem = runtimeData.mapGrid.gridData[`${x},${y}`];
        if(!gridItem) {
            return null;
        }

        var exits = {};

        if(gridItem.t) {
            exits[C.TOP] = utils.getRoomNameFromXY(x,y-1);
        }
        if(gridItem.b) {
            exits[C.BOTTOM] = utils.getRoomNameFromXY(x,y+1);
        }
        if(gridItem.l) {
            exits[C.LEFT] = utils.getRoomNameFromXY(x-1,y);
        }
        if(gridItem.r) {
            exits[C.RIGHT] = utils.getRoomNameFromXY(x+1,y);
        }

        return exits;
    }

    function xyToIndex(xx, yy) {
      let ox = originX - xx;
      let oy = originY - yy;
      if (ox < 0 || ox >= kRouteGrid * 2 || oy < 0 || oy >= kRouteGrid * 2) {
        return;
      }
      return ox * kRouteGrid * 2 + oy;
    }

    function indexToXY(index) {
      return [ originX - Math.floor(index / (kRouteGrid * 2)), originY - index % (kRouteGrid * 2) ];
    }

    function heuristic(xx, yy) {
      return Math.abs(xx - toX) + Math.abs(yy - toY);
    }

    return {

        findRoute(fromRoom, toRoom, opts) {
            if(_.isObject(fromRoom)) {
                fromRoom = fromRoom.name;
            }
            if(_.isObject(toRoom)) {
                toRoom = toRoom.name;
            }
            if(fromRoom == toRoom) {
                return [];
            }
           
			if(!/(W|E)\d+(N|S)\d+$/.test(fromRoom) || !/(W|E)\d+(N|S)\d+$/.test(toRoom)) {
				return C.ERR_NO_PATH;
			}

			var [fromX, fromY] = utils.roomNameToXY(fromRoom);
			[toX, toY] = utils.roomNameToXY(toRoom);

			if (fromX == toX && fromY == toY) {
				return [];
			}

			originX = fromX + kRouteGrid;
			originY = fromY + kRouteGrid;

			// Init path finding structures
			if (heap) {
			  heap.clear();
			  openClosed.clear();
			} else {
			  heap = new Heap(Math.pow(kRouteGrid * 2, 2), Float64Array);
			  openClosed = new OpenClosed(Math.pow(kRouteGrid * 2, 2));
			}
			if (!parents) {
			  parents = new Uint16Array(Math.pow(kRouteGrid * 2, 2));
			}
			var fromIndex = xyToIndex(fromX, fromY);
			heap.push(fromIndex, heuristic(fromX, fromY));
			var routeCallback = (opts && opts.routeCallback) || function() { return 1; };

			// Astar
			while (heap.size()) {

			  // Pull node off heap
			  let index = heap.min();
			  let fcost = heap.minPriority();

			  // Close this node
			  heap.pop();
			  openClosed.close(index);

			  // Calculate costs
			  let [ xx, yy ] = indexToXY(index);
			  let hcost = heuristic(xx, yy);
			  let gcost = fcost - hcost;

			  // Reached destination?
			  if (hcost === 0) {
				let route = [];
				while (index !== fromIndex) {
				  let [ xx, yy ] = indexToXY(index);
				  index = parents[index];
				  let [ nx, ny ] = indexToXY(index);
				  let dir;
				  if (nx < xx) {
					dir = C.FIND_EXIT_RIGHT;
				  } else if (nx > xx) {
					dir = C.FIND_EXIT_LEFT;
				  } else if (ny < yy) {
					dir = C.FIND_EXIT_BOTTOM;
				  } else {
					dir = C.FIND_EXIT_TOP;
				  }
				  route.push({
					exit: dir,
					room: utils.getRoomNameFromXY(xx, yy),
				  });
				}
				route.reverse();
				return route;
			  }

			  // Add neighbors
			  let fromRoomName = utils.getRoomNameFromXY(xx, yy);
			  let exits = describeExits(fromRoomName);
			  for (let dir in exits) {

				// Calculate costs and check if this node was already visited
				let roomName = exits[dir];
				let graphKey = fromRoomName+ ':'+ roomName;
				let [ xx, yy ] = utils.roomNameToXY(roomName);
				let neighborIndex = xyToIndex(xx, yy);
				if (neighborIndex === undefined || openClosed.isClosed(neighborIndex)) {
				  continue;
				}
				let cost = Number(routeCallback(roomName, fromRoomName)) || 1;
				if (cost === Infinity) {
				  continue;
				}

				let fcost = gcost + heuristic(xx, yy) + cost;

				// Add to or update heap
				if (openClosed.isOpen(neighborIndex)) {
				  if (heap.priority(neighborIndex) > fcost) {
					heap.update(neighborIndex, fcost);
					parents[neighborIndex] = index;
				  }
				} else {
				  heap.push(neighborIndex, fcost);
				  openClosed.open(neighborIndex);
				  parents[neighborIndex] = index;
				}
			  }
			}

			return C.ERR_NO_PATH;
        },

        findExit(fromRoom, toRoom, opts) {
            var route = this.findRoute(fromRoom, toRoom, opts);
            if(!_.isArray(route)) {
                return route;
            }
            if(!route.length) {
                return C.ERR_INVALID_ARGS;
            }
            return route[0].exit;
        },

        describeExits,

        isRoomProtected(roomName) {
            register.deprecated('Method `Game.map.isRoomProtected` is deprecated and will be removed. Please use `Game.map.isRoomAvailable` instead.');
            if(!/^(W|E)\d+(N|S)\d+$/.test(roomName)) {
                return null;
            }
            return !_.contains(runtimeData.accessibleRooms, roomName);
        },

        isRoomAvailable(roomName) {
            if(!/^(W|E)\d+(N|S)\d+$/.test(roomName)) {
                return false;
            }
            return _.contains(runtimeData.accessibleRooms, roomName);
        },
		
		getTerrainAt(x, y, roomName) {

            if(_.isObject(x)) {
                y = x.y;
                roomName = x.roomName;
                x = x.x;
            }

            if(!runtimeData.staticTerrainData || !runtimeData.staticTerrainData[roomName]) {
                return undefined;
            }
            var terrain = runtimeData.staticTerrainData[roomName][y*50+x];
            if(terrain & C.TERRAIN_MASK_WALL) {
                return 'wall'
            }
            if(terrain & C.TERRAIN_MASK_SWAMP) {
                return 'swamp';
            }
            return 'plain';
        },

        getRoomLinearDistance(roomName1, roomName2, continuous) {
            return utils.calcRoomsDistance(roomName1, roomName2, continuous);
        },

        getWorldSize() {
            return driver.getWorldSize();
        }
    }
};
