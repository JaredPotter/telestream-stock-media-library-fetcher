const axios = require("axios");
const dotenv = require("dotenv");
const fs = require("fs-extra");
const Path = require("path");
const { resolve } = require("path");
const sanitize = require("sanitize-filename");
const PromisePool = require("es6-promise-pool");

dotenv.config();

const mongoDb = require("./mongodb");

const IS_PRINTING = true;

const args = process.argv.slice(2);
// const type = "audio";
const type = args[0];
console.log(`Type: ${type}`);

if (type !== "video" && type !== "graphic" && type !== "audio") {
  console.log("type paramenter required. E.g. node downloader.js video");
  return;
}

const directory = args[1] ? args[1] : ".";
// const directory = "/Volumes/DroboFS/tdb112270712/3/Public";
console.log(`Directory: ${directory}`);

fs.ensureDirSync(`${directory}/${type}/`);

const SERIAL_KEY = process.env.SERIAL_KEY;

if (!SERIAL_KEY) {
  console.log("SERIAL_KEY is missing! Create .env file with your SERIAL_KEY");
  return;
}

const JSON_FILENAME = `${type}_last_downloaded.json`;

let startingId = 0;

try {
  const file = fs.readFileSync(JSON_FILENAME, "UTF8");
  const payload = JSON.parse(file);
  startingId = payload.lastDownloadedId ? payload.lastDownloadedId : 0;
} catch (error) {
  // do nothing
}

(async () => {
  try {
    await mongoDb.connect();
  } catch (error) {
    console.log(error);
    console.log("Failed to connect to database.");
    console.log("Script will now abort!");
    return;
  }

  const assetList = await mongoDb.find(type);
  const lastAssetId = assetList[assetList.length - 1].asset.id;
  let currentId = startingId;

  const totalBytes = assetList.reduce((total, item) => {
    let size = 0;

    if (type === "audio") {
      size = item.asset.download_format_details.MP3.file_size_bytes;
    } else if (type === "video") {
      // todo
    } else if (type === "graphic") {
      // todo;
    }

    return total + size;
  }, 0);

  console.log(`Total Bytes: ${totalBytes}`);

  console.log("STARING ID: " + startingId);
  console.log("ENDING ID: " + lastAssetId);

  const promiseProducer = function () {
    if (currentId <= lastAssetId) {
      const item = assetList[currentId];

      if (!item) {
        return null;
      }

      currentId++;

      return downloadItem(type, item.asset, SERIAL_KEY);
    } else {
      return null;
    }
  };

  const concurrency = 4;
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

function downloadItem(type, item, SERIAL_KEY) {
  return new Promise((resolve, reject) => {
    const downloadUrl = `https://api.cloud.telestream.net/sm/v1.0/${type}/download/${item.id}`;

    if (IS_PRINTING) {
      console.log(`Starting download for: ${item.id}`);
    }

    axios
      .get(downloadUrl, {
        headers: {
          serial_number: SERIAL_KEY,
        },
      })
      .then((response) => {
        let mediaDownloadUrl;
        let fileExtension;

        if (type === "audio") {
          mediaDownloadUrl = response.data.info.alternateFormats.MP3;
          fileExtension = "mp3";
        } else if (type === "video") {
          // mediaDownloadUrl = response.data.info;
          // todo: add video download
          fileExtension = "mp4";
        } else if (type === "graphic") {
          if (item.has_alpha) {
            // Is Alpha Layer, download PNG version
            // todo: add graphic download
            debugger;
            mediaDownloadUrl = response.data.info.alternateFormats.PNG;
            fileExtension = "png";
          } else {
            mediaDownloadUrl = response.data.info.alternateFormats.JPG;
            fileExtension = "jpg";
          }
        }
        const filename = sanitize(`${item.title}.${fileExtension}`);

        const path = Path.resolve(directory, `${type}`, filename);
        const writer = fs.createWriteStream(path);

        axios
          .get(mediaDownloadUrl, { responseType: "stream" })
          .then((fileResponse) => {
            // Save File
            fileResponse.data.pipe(writer);

            lastDownloadedId = item.id;

            fs.writeFile(
              JSON_FILENAME,
              JSON.stringify({ lastDownloadedId }),
              () => null
            );

            resolve();
            return;
          })
          .catch((error) => {
            console.log(error);
            resolve("ERROR");
          });
      })
      .catch((error) => {
        console.log(error);
        resolve("ERROR");
      });
  });
}
