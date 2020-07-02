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
        reject(err);
      } else {
        console.log("SUCCESSFULLY INSERTED A NEW DOCUMENT");

        resolve(res);
      }
    });
  });
};

module.exports = { connect, insert, close };
