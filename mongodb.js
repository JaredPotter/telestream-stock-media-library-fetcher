const mongoClient = require("mongodb").MongoClient;
const objectId = require("mongodb").ObjectId;

const MONGO_DB_URL = "mongodb://localhost:27017/";
const SETTINGS = {
  useUnifiedTopology: true,
};
const DATABASE_NAME = "stock-media-library-db";

let database;

let connectionClient;

const connect = async function () {
  return new Promise((resolve, reject) => {
    mongoClient.connect(MONGO_DB_URL, SETTINGS, function (err, client) {
      connectionClient = client;

      if (err) {
        reject(err);
      } else {
        console.log("SUCCESSFULLY CONNECTED TO DATABASE!");
        database = client.db(DATABASE_NAME);
        resolve(true);
      }
    });
  });
};

const close = function () {
  debugger;
  connectionClient.close();
  console.log("Database Connection CLOSED!");
};

const insert = function (type, asset) {
  return new Promise((resolve, reject) => {
    const collection = database.collection(type);

    collection.insertOne(asset, function (err, res) {
      if (err) {
        if (err.code === 11000) {
          console.log("Duplicate Key - skipping");
        }
        resolve();
        // reject();
      } else {
        console.log("SUCCESSFULLY INSERTED A NEW DOCUMENT: " + asset._id);

        resolve(res);
      }
    });
  });
};

const find = function (type, query = {}) {
  return new Promise((resolve, reject) => {
    const collection = database.collection(type);

    collection.find(query).toArray((error, response) => {
      if (error) {
        console.log("Failed to find item");
        resolve();
      } else {
        resolve(response);
      }
    });
  });
};

module.exports = { connect, insert, find, close };
