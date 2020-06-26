const axios = require("axios");
const dotenv = require("dotenv");
const fs = require("fs-extra");
const Path = require("path");
dotenv.config();

fs.ensureDirSync("audio/");
fs.ensureDirSync("video/");
fs.ensureDirSync("graphic/");

const args = process.argv.slice(2);
// const type = args[0];
const type = "audio";
console.log(`Type: ${type}`);

const SERIAL_KEY = process.env.SERIAL_KEY;

if (!SERIAL_KEY) {
  console.log("SERIAL_KEY is missing! Create .env file with your SERIAL_KEY");
  return;
}

if (type !== "video" && type !== "graphic" && type !== "audio") {
  console.log("type paramenter required. E.g. node download.js video");
  return;
}

const fileName = `${type}_list.json`;
const file = fs.readFileSync(fileName, "UTF8");
const list = JSON.parse(file).list;
console.log(`Item Count: ${list.length}`);

// const list = [
//   {
//     id: 28,
//   },
// ];

// for (let i = 0; i < list.length; i++) {
for (let i = 0; i < 5; i++) {
  const item = list[i];

  const downloadUrl = `https://api.cloud.telestream.net/sm/v1.0/${type}/download/${item.id}`;

  axios
    .get(downloadUrl, {
      headers: {
        serial_number: SERIAL_KEY,
      },
    })
    .then((response) => {
      console.log(response);
      let mediaDownloadUrl;

      if (type === "audio") {
        mediaDownloadUrl = response.data.info.alternateFormats.MP3;
      } else if (type === "video") {
        // mediaDownloadUrl = response.data.info;
      } else if (type === "graphic") {
        if (item.has_alpha) {
          // Is Alpha Layer, download PNG version
          debugger;
          mediaDownloadUrl = response.data.info.alternateFormats.PNG;
        } else {
          mediaDownloadUrl = response.data.info.alternateFormats.JPG;
        }
        // mediaDownloadUrl = response.data.info
      }

      const path = Path.resolve(__dirname, `${type}`, `${item.title}.mp3`);
      const writer = fs.createWriteStream(path);
      axios
        .get(mediaDownloadUrl, { responseType: "stream" })
        .then((fileResponse) => {
          if (type === "audio") {
            fileResponse.data.pipe(writer);
            // const filename = `${type}/${item.title}.mp3`;
            debugger;
            // fs.writeFile(filename, fileResponse.data, (error) => {
            //   if (error) {
            //     console.log(error);
            //     return;
            //   }
            //   console.log(`File (${filename}) saved successfully`);
            // });
          } else if (type === "graphic") {
            // fs.writeFile(`${type}/${item.title}.mp3`); PNG
            // fs.writeFile(`${type}/${item.title}.mp3`); JPEG
          } else if (type === "video") {
            fs.writeFile(`${type}/${item.title}.mp4`);
          }
        })
        .catch((error) => {
          console.log(error);
        });
    })
    .catch((error) => {
      console.log(error);
    });
}
