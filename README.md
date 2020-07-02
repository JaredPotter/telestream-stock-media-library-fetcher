# Fetch Meta Data + Download Assets from Telestream's Stock Media Library

### DISCLAIMER: This is for security research & educational purposes only. Telestream's Stock Media Library EULA specificially probits "scraping" their contenet.

    "You cannot use automation, such as computer scripts, to download or “scrape” high volumes of our Stock Files."

## Requirements

Node.js

MongoDB (https://www.mongodb.com/try/download/community?tck=docs_server)

# Usage

`npm install`

`node fetcher.js audio`

\*downloads meta data for all assets of tha type

`node downloader.js audio`

\*downloads all files of asset type
