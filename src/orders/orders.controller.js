const path = require("path");

// Use the existing dishes data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// Middleware function to verify and validate the request body properties
// Originally the verification and validation were separate functions, but
// because of the way the tests were written it was combined into a
// single larger function.
function hasRequiredProperties(req, res, next) {
  const numberCheck = /^\d+$/;
  const fields = [
    { name: "deliverTo", type: "string" },
    { name: "mobileNumber", type: "string" },
    { name: "dishes", type: "array" },
    { name: "quantity", type: "array-val", host: "dishes" },
  ];
  const newOrder = req.body.data;
  for (let field of fields) {
    if (field.type !== "array-val") {
      if (!newOrder.hasOwnProperty(field.name)) {
        next({
          status: 400,
          message: `1Dish must include a ${field.name}`,
        });
      }
    }
    switch (field.type) {
      case "string": {
        if (!newOrder[field.name].length) {
          next({
            status: 400,
            message: `Dish must include a ${field.name}`,
          });
        }
        break;
      }
      case "number": {
        if (
          newOrder[field.name] <= 0 ||
          !numberCheck.test(newOrder[field.name]) ||
          typeof newOrder[field.name] === "string"
        ) {
          next({
            status: 400,
            message: `Dish must have a ${field.name} that is an integer greater than 0`,
          });
        }
        break;
      }
      case "array": {
        if (typeof newOrder[field.name] !== "object") {
          next({
            status: 400,
            message: `Order must include at least one dish`,
          });
        }
        if (!newOrder[field.name].length) {
          next({
            status: 400,
            message: `Order must include at least one dish`,
          });
        }
        break;
      }
      case "array-val": {
        let nIndex = 0;
        const results = newOrder[field.host].filter((order, idx) => {
          let bResults = false;
          if (order.hasOwnProperty(field.name)) {
            if (order[field.name] > 0) {
              if (typeof order[field.name] !== "string") {
                if (numberCheck.test(order[field.name])) {
                  bResults = true;
                }
              }
            }
          }
          nIndex = idx;
          return bResults;
        });
        if (results.length !== newOrder[field.host].length) {
          next({
            status: 400,
            message: `Dish ${nIndex} must have a ${field.name} that is an integer greater than 0`,
          });
        }
      }
      default: {
        break;
      }
    } // End switch (field.type)
  } // End for loop
  return next();
}

// Middleware function to verify a order exists
function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);
  if (foundOrder) {
    res.locals.order = foundOrder;
    return next();
  }
  next({
    status: 404,
    message: `Order does not exist: ${orderId}`,
  });
}

// Middleware function to verify the status of the order
function checkOrderStatus(req, res, next) {
  if (res.locals.order.status === "pending") {
    return next();
  }
  next({
    status: 400,
    message: `An order cannot be deleted unless it is pending`,
  });
}

// Middleware function to perform additional validation on order updates
function checkUpdateProperties(req, res, next) {
  let foundOrder = res.locals.order;
  const { orderId } = req.params;
  const {
    data: { id, deliverTo, mobileNumber, status, dishes } = {},
  } = req.body;
  const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"];

  if (id) {
    if (id !== orderId) {
      return next({
        status: 400,
        message: `Order id does not match route id. Order: ${id} Route:${orderId}`,
      });
    }
  }

  if (!status) {
    return next({
      status: 400,
      message: `Order must have a status of pending, preparing, out-for-delivery, delivered`,
    });
  }

  if (
    (status && !status.length) ||
    (status && status.length && !validStatus.includes(status))
  ) {
    return next({
      status: 400,
      message: `Order must have a status of pending, preparing, out-for-delivery, delivered`,
    });
  }

  if (status && status.length && status === "delivered") {
    return next({
      status: 400,
      message: `A delivered order cannot be changed`,
    });
  }

  foundOrder = { ...foundOrder, deliverTo, mobileNumber, status, dishes };
  res.locals.order = foundOrder;
  return next();
}

// START - Route Functions

// This function returns an array of orders
function list(req, res) {
  res.json({ data: orders });
}

// This function returns a single order object.
function read(req, res) {
  res.json({ data: res.locals.order });
}

// This function will create a new order and add it to the orders array.
function create(req, res) {
  const { data: { deliverTo, mobileNumber, status, dishes } = {} } = req.body;
  const newOrder = {
    id: nextId(),
    deliverTo,
    mobileNumber,
    status,
    dishes,
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

// This function updates an existing order object.
function update(req, res, next) {
  res.json({ data: res.locals.order });
}

// This function will delete an order
function destroy(req, res, next) {
  const { orderId } = req.params;
  const index = orders.findIndex((order) => order.id === orderId);
  if (index > -1) {
    orders.splice(index, 1);
    res.sendStatus(204);
  } else {
    next({
      status: 404,
      message: `Order id not found: ${orderId}`,
    });
  }
}

module.exports = {
  create: [hasRequiredProperties, create],
  list,
  read: [orderExists, read],
  update: [orderExists, hasRequiredProperties, checkUpdateProperties, update],
  delete: [orderExists, checkOrderStatus, destroy],
};
