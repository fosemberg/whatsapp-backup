# WhatsApp Format Converters

This project includes two converters to transform WhatsApp backup data between different formats:

1. **JSON to Native Format Converter** (`src/json-to-native-converter.js`)
2. **Native to JSON Format Converter** (`src/native-to-json-converter.js`)

## Formats Supported

### Format 1: JSON Format (`chats.json`)
- Structured JSON array of message objects
- Each message contains:
  - `country`: Sender's country
  - `phoneNum`: Phone number (including country code)
  - `formattedName`: Display name
  - `displayName`: Optional display name
  - `messageTime`: ISO timestamp (e.g., "2025-02-28 18:50:57")
  - `messageType`: Type of message ("chat", "image", "video", "audio", "document", "pdf")
  - `messageBody`: Message content or filename for attachments
  - `messageId`: Unique message identifier

### Format 2: Native WhatsApp Text Format
- Plain text format similar to WhatsApp's native export
- Date format: `MM/DD/YY, HH:MM` or `[DD.MM.YYYY, HH:MM:SS]`
- Message format: `DATE - SENDER: MESSAGE`
- Attachments: `FILENAME (file attached)`
- Multi-line messages continue on subsequent lines
- System messages (encryption notices, etc.)

## Usage

### JSON to Native Converter

```bash
node src/json-to-native-converter.js <input.json> <output.txt> [attachments_dir]
```

**Parameters:**
- `input.json`: Path to the input JSON file
- `output.txt`: Path for the output native WhatsApp text file
- `attachments_dir`: Optional directory to copy media files to

**Example:**
```bash
node src/json-to-native-converter.js data/input/2025/1234567890___Test-Chat/chats.json output/chat.txt output/attachments/
```

### Native to JSON Converter

```bash
node src/native-to-json-converter.js <input.txt> <output.json> [attachments_dir]
```

**Parameters:**
- `input.txt`: Path to the input native WhatsApp text file
- `output.json`: Path for the output JSON file
- `attachments_dir`: Optional directory to copy media files from

**Example:**
```bash
node src/native-to-json-converter.js data/input/2025/1234567890___Test-Chat/backup.txt output/chats.json data/attachments/
```

## Features

### Media File Handling
- Automatically detects and handles various file types:
  - Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
  - Videos: `.mp4`, `.avi`, `.mov`, `.mkv`
  - Audio: `.mp3`, `.wav`, `.ogg`, `.m4a`
  - Documents: `.pdf`, `.doc`, `.docx`, `.txt`, `.xlsx`, `.ppt`
- Copies media files between source and destination directories
- Preserves original filenames and extensions

### Date Format Support
- Handles multiple date formats:
  - `3/4/25, 0:50` (MM/DD/YY, H:MM)
  - `[20.06.2025, 12:29:30]` (DD.MM.YYYY, HH:MM:SS)
- Converts between ISO format and native WhatsApp formats

### Message Types
- Regular text messages
- Multi-line messages
- Image/video/audio/document attachments
- Special image references (`【IMAGE】`)
- System messages (filtered out during conversion)

### Sender Identification
- Handles phone numbers with country codes
- Distinguishes between incoming and outgoing messages
- Preserves display names and formatted names
- Basic country detection from phone numbers

## Testing

Run the test script to verify both converters:

```bash
node src/test-converters.js
```

This will:
1. Test JSON to Native conversion
2. Test Native to JSON conversion
3. Handle media file copying
4. Create output in `test-output/` directory

## Error Handling

- Validates input file formats
- Handles missing media files gracefully
- Provides detailed error messages
- Warns about parsing issues without stopping conversion

## Limitations

- Country detection is basic and may not cover all country codes
- Some message metadata may be lost during conversion
- Deleted messages and edited message markers are handled but may not be perfectly preserved
- Generated message IDs in Native→JSON conversion are synthetic

## Dependencies

- Node.js (built-in modules only: `fs`, `path`)
- No external dependencies required