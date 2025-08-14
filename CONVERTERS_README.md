# WhatsApp Converters

Scripts for converting between WhatsApp formats:
- `json-to-native-converter.js` - Convert JSON → Native format
- `native-to-json-converter.js` - Convert Native → JSON format

## 🚀 Usage

### JSON to Native format

```bash
node src/json-to-native-converter.js input.json output.txt [attachments_directory]
```

**Example:**
```bash
node src/json-to-native-converter.js \
  data/input/2025/1234567890___Test-Chat/chats.json \
  output/chat.txt \
  output/attachments/
```

### Native to JSON format

```bash
node src/native-to-json-converter.js input.txt output.json [attachments_directory]
```

**Example:**
```bash
node src/native-to-json-converter.js \
  data/input/2025/1234567890___Test-Chat/native_backups/WhatsApp\ Chat\ with\ +12\ 345\ 67\ 89\ 0.txt \
  output/chat.json \
  output/attachments/
```

## 📁 Data Formats

### JSON format
```json
[
  {
    "country": "Test Country",
    "phoneNum": "+1234567890",
    "formattedName": "Test User",
    "displayName": "Test Display Name",
    "messageTime": "2025-02-28 18:50:57",
    "messageType": "chat",
    "messageBody": "Hello world!",
    "messageId": "false_1234567890@c.us_3AE89C28F3DDBCB49792"
  },
  {
    "country": "Test Country",
    "phoneNum": "+1234567890", 
    "formattedName": "Test User",
    "messageTime": "2025-02-28 19:00:00",
    "messageType": "image",
    "messageBody": "photo.jpg",
    "messageId": "false_1234567890@c.us_3BB4C39DA8E53A0B1EFD"
  }
]
```

### Native format
```
2/28/25, 18:50 - Test User: Hello world!
2/28/25, 19:00 - Test User: photo.jpg (file attached)
```

## 🎯 Features

- **Automatic file type detection** by extension
- **Attachment support**: images, videos, documents, audio
- **Correct multi-line message handling**
- **Unique message ID generation**
- **Media file directory structure preservation**

## 📊 Supported Message Types

- `chat` - Text messages
- `image` - Images (.jpg, .jpeg, .png, .gif, .webp)
- `video` - Videos (.mp4, .avi, .mov, .mkv)
- `audio` - Audio (.mp3, .wav, .ogg, .m4a)
- `document` - Documents (.pdf, .doc, .txt, etc.)

## 🧪 Testing

```bash
# Run main tests
node src/test-converters.js

# Test directory structure
node src/test-directory-structure.js
```

Tests create test data and verify converter operation in both directions.