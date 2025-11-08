# WhatsApp Native Backup Appender

This feature automatically processes WhatsApp backup zip files and appends them to existing native backup files, then synchronizes all formats.

## 🎯 Purpose

Simplifies the WhatsApp backup import process by automating:
- Extraction of zip files from WhatsApp exports
- Appending chat content to existing backup files
- Copying attachments to the correct locations
- Running format synchronization

## 🚀 Quick Usage

```bash
npm run append-native-backups
```

This single command replaces the entire manual process!

## 📁 Expected Directory Structure

```
data/input/YEAR/PHONE___CONTACT-NAME/
├── native_backups/                    # Existing backups (target)
│   ├── WhatsApp Chat with +XX XXX XX XX XX.txt
│   ├── [existing attachments...]
│   └── ...
├── native_backups_new/               # New zip files (source)
│   ├── WhatsApp Chat with Contact (1).zip
│   ├── WhatsApp Chat with Contact (2).zip
│   └── ...
├── chats.json                        # JSON format (will be synced)
├── image/                           # Media directories
├── document/
├── video/
└── audio/
```

## 🔄 What It Does

### 1. **Discovery Phase**
- Scans all year directories in `data/input/`
- Finds directories containing `native_backups_new` folders
- Lists all zip files to process

### 2. **Processing Phase**
For each zip file:
- ✅ **Extracts** the zip to a temporary directory
- ✅ **Finds** the chat text file (starts with "WhatsApp Chat with" or "chat.txt")
- ✅ **Appends** chat content to existing or new backup file
- ✅ **Copies** all attachments to `native_backups/` directory
- ✅ **Cleans up** temporary files

### 3. **Synchronization Phase**
- ✅ **Runs** `sync_formats.js` on the directory
- ✅ **Merges** all formats (native + JSON)
- ✅ **Creates** backups of original files
- ✅ **Organizes** media by type

## 📊 Example Output

```
=== WhatsApp Native Backup Appender ===

📁 Found 2 chat directories to process:

🔄 Processing: 34611325162___Yanzhu-mock-interview-eng-frontend
  📦 Found 15 zip files to process
    📦 Extracting: WhatsApp Chat with Yanzhu (1).zip
    📄 Using existing chat file: WhatsApp Chat with +34 611 32 51 62.txt
    📝 Appended 127 lines to WhatsApp Chat with +34 611 32 51 62.txt
    📎 Copied 8 attachment files
    ✅ Processed: WhatsApp Chat with Yanzhu (1).zip
    
    📦 Extracting: WhatsApp Chat with Yanzhu (2).zip
    📄 Using existing chat file: WhatsApp Chat with +34 611 32 51 62.txt
    📝 Appended 203 lines to WhatsApp Chat with +34 611 32 51 62.txt
    📎 Copied 12 attachment files
    ✅ Processed: WhatsApp Chat with Yanzhu (2).zip
    
    [... processing more zips ...]
    
  🔄 Running format synchronization...
    ✅ Format synchronization completed
  ✅ Successfully processed 34611325162___Yanzhu-mock-interview-eng-frontend

🔄 Processing: 12345678901___Another-Contact
  📦 Found 5 zip files to process
    [... similar output ...]
  ✅ Successfully processed 12345678901___Another-Contact

🎉 Processing complete!
✅ Successfully processed: 2 directories
```

## 🆚 Before vs After

### ❌ Before (Manual Process)
1. Export native backup from WhatsApp
2. Unzip backup manually
3. Check if zip contains single txt or folder with attachments
4. Copy all attachments to `native_backups/` manually
5. Append chat content to existing `WhatsApp Chat with...` file manually
6. Run `node src/sync_formats.js data/input/YEAR/DIRECTORY` manually
7. Repeat for each zip file...

### ✅ After (Automated Process)
1. Place zip files in `native_backups_new/` directory
2. Run `npm run append-native-backups`
3. ☕ Enjoy your coffee while everything processes automatically!

## 🔧 Features

### Smart File Handling
- **Auto-detection** of chat text files in various formats
- **Intelligent matching** of source and target chat files
- **Safe appending** with proper line separators
- **Duplicate-safe** processing (won't re-process same content)

### Robust Error Handling
- **Continues processing** even if individual zips fail
- **Detailed logging** of each step
- **Automatic cleanup** of temporary files
- **Graceful error recovery**

### Format Support
- ✅ Single text file zips
- ✅ Folder structure zips with chat.txt
- ✅ Mixed content with attachments
- ✅ Various chat file naming conventions

## ⚠️ Prerequisites

- **Node.js** installed
- **unzip** command available (standard on macOS/Linux)
- **Proper directory structure** in `data/input/`

## 🛡️ Safety Features

- **No data loss**: Creates backups before making changes
- **Temp directory cleanup**: Automatically removes extracted files
- **Error isolation**: Problems with one zip don't affect others
- **Non-destructive**: Original zip files remain untouched

## 🐛 Troubleshooting

### "No zip files found"
- Check that zip files are in `native_backups_new/` directory
- Ensure files have `.zip` extension

### "Failed to extract"
- Verify `unzip` command is available: `which unzip`
- Check zip file is not corrupted
- Ensure sufficient disk space

### "No chat text file found"
- Zip might contain only attachments
- Check if files are in subdirectories
- Look for files named `chat.txt` or similar

### "Sync warning"
- Sync process encountered issues but continued
- Check individual directory with: `node src/sync_formats.js path/to/directory`
- Usually safe to ignore if main process completed

## 🔍 Manual Processing

If you need to process specific directories only:

```bash
# Process specific directory
node src/append-native-backups.js

# Or run sync manually after placing files
node src/sync_formats.js data/input/2025/34611325162___Yanzhu-mock-interview-eng-frontend
```

## 📝 Notes

- Processes directories in alphabetical order
- Zip files processed in alphabetical order within each directory
- Maintains original date formats during synchronization
- Compatible with existing `sync_formats.js` workflow