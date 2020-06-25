const fs = require("fs");
const file = fs.readFileSync("audio_list.json", "UTF8");
const payload = JSON.parse(file);
const list = payload.list;

let totalBytes = 0;

console.log("Computing...");

for (const audioItem of list) {
  const size = audioItem.download_format_details.MP3.file_size_bytes;

  totalBytes += size;
}

console.log("Total Audio Item Count: " + list.length);
console.log("Total Bytes: " + totalBytes);
console.log("Total Gigabytes : " + totalBytes / 1000000000);
console.log("Total TetaBytes  : " + totalBytes / 1000000000000);
