const axios = require("axios");
const fs = require("fs");
const PromisePool = require("es6-promise-pool");

const mongoDb = require("./mongodb");

const IS_PRINTING = false;

const args = process.argv.slice(2);
const type = args[0];
// const type = "audio";

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
  try {
    await mongoDb.connect();
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

  let currentId = startingId;
  console.log("Starting at ID: " + startingId);
  console.log("Ending a ID: " + latestAssetId);

  const promiseProducer = function () {
    if (currentId <= latestAssetId) {
      const itemUrl = `${BASE_URL}/${currentId}`;

      currentId++;

      return fetchItem(itemUrl, currentId, mongoDb);
    } else {
      return null;
    }
  };

  const concurrency = 50;
  const pool = new PromisePool(promiseProducer, concurrency);

  console.log("Starting Request Pool!");
  pool
    .start()
    .then(
      () => {
        console.log("All promises fulfilled");

        // mongoDb.close();
        return;
      },
      (error) => {
        console.log("Some promise rejected: " + error.message);
      }
    )
    .catch((error) => {
      console.log(error);
      debugger;
    });
})();

function fetchItem(itemUrl, id, mongoDb) {
  return new Promise((resolve, reject) => {
    if (IS_PRINTING) {
      console.log("Requesting: " + itemUrl);
    }

    axios
      .get(itemUrl)
      .then((result) => {
        if (IS_PRINTING) {
          console.log("Success");
        }

        const info = result.data.info;
        const asset = {
          _id: id,
          asset: info,
        };

        lastFetchedId = id;

        fs.writeFile(
          JSON_FILENAME,
          JSON.stringify({ lastFetchedId }),
          () => null
        );

        mongoDb.insert(type, asset);

        resolve();
        return;
      })
      .catch((error) => {
        debugger;
        if (IS_PRINTING) {
          console.log("Fail");
        }

        resolve(); // lol
        // reject(error);
        return;
      });
  });
}
