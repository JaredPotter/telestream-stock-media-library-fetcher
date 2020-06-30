const axios = require("axios");
const fs = require("fs");
const PromisePool = require("es6-promise-pool");

const BASE_VIDEO_URL = "https://api.cloud.telestream.net/sm/v1.0/video";

let startingId = 0;
let videoItemsMap = {};
let lastFetchedId;

try {
  const file = fs.readFileSync("video_list.json", "UTF8");
  const payload = JSON.parse(file);
  startingId = payload.lastFetchedId ? payload.lastFetchedId : 0;
  videoItemsMap = JSON.parse(JSON.stringify(payload.itemsMap));
} catch (error) {
  // do nothing
}

lastFetchedId = startingId;

const IS_PRINTING = false;

(async () => {
  // Fetch most recent video ID:
  // https://api.cloud.telestream.net/sm/v1.0/video/search?num_results=12&sort=most_recent&page=1&keywords=*
  const latestVideo = await axios.get(`${BASE_VIDEO_URL}/search`, {
    params: {
      num_results: 1,
      sort: "most_recent",
      page: 1,
    },
  });
  const latestVideoId = latestVideo.data.info[0].id;

  const generatePromises = function* () {
    console.log("Starting at ID: " + startingId);
    console.log("Ending a ID: " + latestVideoId);
    for (let i = startingId; i < latestVideoId; i++) {
      // for (let i = startingId; i < 11; i++) { // testing / dev
      const itemUrl = `${BASE_VIDEO_URL}/${i}`;

      yield fetchItem(itemUrl, i);
    }
  };

  const promiseProducer = generatePromises();

  const concurrency = 100;
  const pool = new PromisePool(promiseProducer, concurrency);

  pool.addEventListener("fulfilled", function (event) {
    if (event.data.result !== "ERROR") {
      const item = event.data.result.data.info;

      videoItemsMap[item.id] = item;
    }
  });

  console.log("Starting Request Pool!");
  const poolPromise = pool.start();

  // Wait for the pool to settle.
  poolPromise.then(
    function () {
      console.log("All promises fulfilled");
      const payload = {
        lastFetchedId,
        itemsMap: videoItemsMap,
      };

      // Final Save
      console.log("Performing Final Save!");
      fs.writeFileSync("video_list.json", JSON.stringify(payload));
      console.log("Save Complete!");
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

        if (id % 500 === 0) {
          // if (id % 5 === 0) {
          //Save every 2500th ID
          console.log("Saving another 500th - with ID: " + id);

          lastFetchedId = id;
          const payload = {
            lastFetchedId,
            itemsMap: videoItemsMap,
          };
          fs.writeFileSync("video_list.json", JSON.stringify(payload));
        }

        resolve(result);
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
