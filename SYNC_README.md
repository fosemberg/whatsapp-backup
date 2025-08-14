# WhatsApp Format Synchronizer

The `sync_formats.js` script provides bidirectional synchronization between WhatsApp formats:
- JSON format (`chats.json`)
- Native format (`native_backups/WhatsApp Chat with +12 345 67 89 0.txt`)

## 🎯 Key Features

- **Bidirectional synchronization**: Supplements one format with data from another
- **Chronological order**: All messages sorted by time
- **Date normalization**: Supports multiple date formats
- **Duplicate removal**: Automatically finds and merges similar messages
- **Media synchronization**: Copies and organizes attachments
- **Automatic backups**: Creates backup copies before changes

## 📅 Supported Date Formats

### Native format supports:

1. **American format**: `3/4/25, 0:50`
2. **European with brackets**: `[20.06.2025, 12:29:30]`
3. **European without brackets**: `04.07.2025, 20:27:42`

### JSON format:
- **ISO format**: `2025-02-28 18:50:57`

All formats are automatically converted to unified ISO format for synchronization.

## 🚀 Usage

### Basic usage

```bash
node src/sync_formats.js <path_to_chat_folder>
```

### Example

```bash
node src/sync_formats.js data/input/2025/1234567890___Test-Chat
```

## 📁 Chat Folder Structure

```
chat_directory/
├── chats.json                     # JSON format (optional)
├── native_backups/               # Native format folder
│   └── WhatsApp Chat with +12 345 67 89 0.txt
├── image/                        # Images
├── document/                     # Documents
├── video/                        # Videos
└── audio/                        # Audio
```

## 🔄 Synchronization Process

1. **File check**: Finds available formats
2. **Parsing**: Reads and analyzes both formats
3. **Date normalization**: Brings all dates to unified format
4. **Merging**: Combines messages, removing duplicates
5. **Sorting**: Orders chronologically
6. **Backups**: Creates backup copies of originals
7. **Media sync**: Organizes attachments by types
8. **Writing**: Saves synchronized formats

## 📊 Example Output

```
=== WhatsApp Format Synchronizer ===

Syncing directory: data/input/2025/chat

📄 JSON file: ✅ Found
📄 Native file: ✅ Found

📖 Parsing JSON file...
   Loaded 5583 messages from JSON
📖 Parsing native file...
   Loaded 2627 messages from native

🔄 Merging messages...
Merging 5583 JSON messages with 2627 native messages...
Merged result: 8137 unique messages

💾 Created backup: chats.json.backup.1755186639328
💾 Created backup: WhatsApp Chat with +12 345 67 89 0.txt.backup.1755186639329

📁 Syncing media files...
Syncing media files...
Created directory: video/
Media file not found: some-missing-file.jpg

💾 Writing synchronized files...
✅ Updated chats.json (8137 messages)
✅ Updated WhatsApp Chat with +12 345 67 89 0.txt (8137 messages)

🎉 Synchronization complete!
📊 Final result: 8137 messages in chronological order
```

## 🔧 Features

### Duplicate Detection

The script considers messages duplicates if:
- Content and message type match
- Sender matches
- Send time differs by less than 1 minute

### Attachment Handling

- **Automatic type detection** by file extension
- **Creating missing folders** (image/, document/, video/, audio/)
- **Moving files** between folders when necessary
- **Warnings about missing files**

### Message Formats

#### JSON format
```json
{
  "country": "Spain",
  "phoneNum": "+1234567890", 
  "formattedName": "User Name",
  "displayName": "Display Name",
  "messageTime": "2025-02-28 18:50:57",
  "messageType": "chat",
  "messageBody": "Message content",
  "messageId": "unique_id"
}
```

#### Native format
```
2/28/25, 18:50 - User Name: Message content
3/4/25, 11:24 - User Name: document.pdf (file attached)
[20.06.2025, 12:29:30] User Name: Message with EU date
```

## 🛡️ Security

- **Automatic backups**: Created before any changes
- **File validation**: Data structure validation
- **Graceful handling**: Skips corrupted messages with warnings

## ⚠️ Limitations

- Works only with specified folder structure
- Requires Node.js
- Some metadata may be lost during conversion
- Generated message IDs during conversion are synthetic

## 🧪 Testing

Run the test script to check functionality:

```bash
node src/test-sync.js
```

The test creates sample data with various date formats and demonstrates a full synchronization cycle.

## 🔍 Diagnostics

### Date Issues
```
Could not parse date: 04.07.2025, 20:27:42
```
**Solution**: Ensure date format matches supported ones

### Missing Media Files
```
Media file not found: photo.jpg
```
**Solution**: Check that files are in correct folders (image/, document/, etc.)

### Parsing Errors
```
Error during conversion: JSON file should contain an array
```
**Solution**: Check JSON file syntax