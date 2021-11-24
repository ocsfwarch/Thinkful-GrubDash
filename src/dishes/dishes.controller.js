const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

// Middleware function to verify and validate the request body properties
// Originally the verification and validation were separate functions, but
// because of the way the tests were written it was combined into a
// single larger function.
function hasRequiredProperties(req, res, next) {
  const numberCheck = /^\d+$/;
  const fields = [
    { name: "name", type: "string" },
    { name: "description", type: "string" },
    { name: "price", type: "number" },
    { name: "image_url", type: "string" },
  ];
  const newDish = req.body.data;
  for (let field of fields) {
    if (!newDish.hasOwnProperty(field.name)) {
      next({
        status: 400,
        message: `Dish must include a ${field.name}`,
      });
    } else {
      switch (field.type) {
        case "string": {
          if (!newDish[field.name].length) {
            next({
              status: 400,
              message: `Dish must include a ${field.name}`,
            });
          }
          break;
        }
        case "number": {
          if (
            newDish[field.name] <= 0 ||
            !numberCheck.test(newDish[field.name]) ||
            typeof newDish[field.name] === "string"
          ) {
            next({
              status: 400,
              message: `Dish must have a ${field.name} that is an integer greater than 0`,
            });
          }
          break;
        }
        default: {
          break;
        }
      } // End switch (field.type)
    } // End else
  } // End for loop
  return next();
}

// Middleware function to verify a dish exists
function dishExists(req, res, next) {
  const { dishId } = req.params;
  const foundDish = dishes.find((dish) => dish.id === dishId);
  if (foundDish) {
    res.locals.dish = foundDish;
    return next();
  }
  next({
    status: 404,
    message: `Dish does not exist: ${dishId}`,
  });
}

// START - Route Functions
// This function returns an array of dishes:
function list(req, res) {
  res.json({ data: dishes });
}

// This function will create a new dish and add it to the dishes array.
function create(req, res) {
  const { data: { name, description, price, image_url } = {} } = req.body;
  const newDish = {
    id: nextId(),
    name,
    description,
    price,
    image_url,
  };
  dishes.push(newDish);
  res.status(201).json({ data: newDish });
}

// This function returns a single dish object.
function read(req, res) {
  res.json({ data: res.locals.dish });
}

// This function updates an existing dish object.
function update(req, res, next) {
  let foundDish = res.locals.dish;
  const { dishId } = req.params;
  const { data: { id, name, description, price, image_url } = {} } = req.body;
  if (id) {
    if (id !== dishId) {
      return next({
        status: 400,
        message: `Dish id does not match route id. Dish: ${id} Route:${dishId}`,
      });
    }
  }
  foundDish = { ...foundDish, name, description, price, image_url };
  res.json({ data: foundDish });
}

module.exports = {
  create: [hasRequiredProperties, create],
  list,
  read: [dishExists, read],
  update: [dishExists, hasRequiredProperties, update],
};
