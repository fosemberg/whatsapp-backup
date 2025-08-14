# whatsapp-backup

A project created to store WhatsApp backups in HTML and PDF formats. To get started, you need to collect the backup as chats.json and attached message files. See below for how to create this data.

## Running the project:
- Install dependencies  
```npm i```
- Copy example data to the data folder  
```npm run copy-input-example-to-data```
- Build chats in HTML and run in browser  
```npm run start```
- Build PDFs. *while chats are running in browser  
```npm run build-pdfs```

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