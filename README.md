# whatsapp-backup

A project created to store WhatsApp backups in HTML and PDF formats. To get started, you need to collect the backup as chats.json and attached message files. See below for how to create this data.

## 🚀 Quick Start

### New Automated Workflow (Recommended)
1. Place WhatsApp zip exports in `data/input/YEAR/CONTACT/native_backups_new/`
2. Run the automated appender: `npm run append-native-backups`
3. Build and view: `npm run start`

### Manual Workflow
- Install dependencies: `npm i`
- Copy example data: `npm run copy-input-example-to-data`
- Build and run: `npm run start`
- Build PDFs: `npm run build-pdfs`

## 📦 Available Commands

### Main Commands
- `npm run append-native-backups` - **NEW!** Auto-process WhatsApp zip exports
- `npm run start` - Build HTML and serve in browser
- `npm run build-pdfs` - Generate PDF versions

### Development
- `npm run copy-input-example-to-data` - Copy example data
- `npm test` - Run tests
- `npm run clean-all-backups` - Clean backup files

## 🎯 New Feature: Automated Native Backup Processing

The new `append-native-backups` feature automates the entire WhatsApp backup import process:

### ✅ What it does:
- Finds all zip files in `native_backups_new` folders
- Extracts and appends chat content to existing backups  
- Copies all attachments to correct locations
- Runs format synchronization automatically
- Processes multiple directories and contacts

### 📁 Expected structure:
```
data/input/2025/PHONE___CONTACT/
├── native_backups/              # Existing backups  
├── native_backups_new/          # Place new zip files here
├── chats.json                   # Will be synced
└── [media folders...]
```

See [APPEND_NATIVE_BACKUPS_README.md](APPEND_NATIVE_BACKUPS_README.md) for detailed documentation.

## Examples
- [View PDF examples](data/output.example/pdf)
- [View web examples](data/output.example/web)

## data folder. how the data was collected

### 2025

- Google Chrome extension was installed:  
    WhatsApp Chats Backup & WA Contacts Extractor Free Extension
    Version 1.1.24
    Updated: February 17, 2025
    Size: 2.44MiB
  https://chromewebstore.google.com/detail/whatsapp-chats-backup-wa/eelhmnjkbjmlcglpiaegojkoolckdgaj?hl=en
- Open web version of WhatsApp:  
    https://web.whatsapp.com/
- Open extension:  
    Chats Backup  
    Choose Export Time:  
    - From: 01/01/2017
    - To: 01/01/2018
    - Export File type: JSON

### outdated

- Google Chrome extension was installed:  
    Backup WhatsApp Chats  
    Version: 1.0.2  
    Updated: 6 January 2021  
    Size: 209KiB  
  https://chrome.google.com/webstore/detail/backup-whatsapp-chats/ibpjljmgmpnfbjbjdajbldfekkcnencp?hl=en-GB
- Web version of WhatsApp was opened:  
    https://web.whatsapp.com/
- All attached photos and videos were viewed so they would be downloaded by the extension, otherwise the extension won't download photos you haven't opened in the client
- Extension was opened:  
    Backup WhatsApp Chats  
    \* range of more than a year cannot be selected   
    parameters:
    - From: 01/01/2017
    - To: 01/01/2018
    - [*] Download media  

## TODO
- Merge history by years so you can view by people rather than by years