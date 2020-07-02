const axios = require("axios");
const fs = require("fs");
const PromisePool = require("es6-promise-pool");

const IS_PRINTING = true;

const args = process.argv.slice(2);
const type = args[0];

console.log(`asset type: ${type}`);

if (type !== "video" && type !== "audio" && type !== "graphic") {
  console.log("ERROR: Invalid type. Must be audio, graphic, or video.");
  console.log("E.g. node download.js video");
  return;
}

const BASE_URL = `https://api.cloud.telestream.net/sm/v1.0/${type}`;
const JSON_FILENAME = `${type}_info.json`;

let startingId = 0;
let lastFetchedId;

try {
  const file = fs.readFileSync(JSON_FILENAME, "UTF8");
  const payload = JSON.parse(file);
  startingId = payload.lastFetchedId ? payload.lastFetchedId : 0;
} catch (error) {
  // do nothing
}

lastFetchedId = startingId;

(async () => {
  const mongoDb = require("./mongodb");

  try {
    isDatabaseConnected = await mongoDb.connect();
  } catch (error) {
    console.log(error);
    console.log("Failed to connect to database.");
    console.log("Script will now abort!");
    return;
  }

  // Fetch most recent asset ID:
  // e.g. https://api.cloud.telestream.net/sm/v1.0/video/search?num_results=12&sort=most_recent&page=1&keywords=*
  const latestAsset = await axios.get(`${BASE_URL}/search`, {
    params: {
      num_results: 1,
      sort: "most_recent",
      page: 1,
    },
  });
  const latestAssetId = latestAsset.data.info[0].id;

  const generatePromises = function* () {
    console.log("Starting at ID: " + startingId);
    console.log("Ending a ID: " + latestAssetId);

    // for (let i = startingId; i < latestAssetId; i++) {
    for (let i = startingId; i < 5; i++) {
      // testing / dev
      const itemUrl = `${BASE_URL}/${i}`;

      yield fetchItem(itemUrl, i);
    }
  };

  const promiseProducer = generatePromises();

  const concurrency = 100;
  const pool = new PromisePool(promiseProducer, concurrency);

  pool.addEventListener("fulfilled", function (event) {
    if (event.data.result !== "ERROR") {
      const asset = event.data.result;
      try {
        mongoDb.insert(type, asset);
      } catch (error) {}
    }
  });

  console.log("Starting Request Pool!");
  const poolPromise = pool.start();

  // Wait for the pool to settle.
  poolPromise.then(
    function () {
      console.log("All promises fulfilled");
    },
    function (error) {
      console.log("Some promise rejected: " + error.message);
    }
  );
})();

function fetchItem(itemUrl, id) {
  return new Promise(async (resolve, reject) => {
    if (IS_PRINTING) {
      console.log("Requesting: " + itemUrl);
    }

    axios
      .get(itemUrl)
      .then((result) => {
        if (IS_PRINTING) {
          console.log("Success");
        }

        const asset = result.data.info;

        resolve({ _id: id, asset });
      })
      .catch((error) => {
        if (IS_PRINTING) {
          console.log("Fail");
        }

        resolve("ERROR");
        reject(error);
      });
  });
}
