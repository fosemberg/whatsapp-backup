#!/bin/bash

# WhatsApp Sync Example Script
# This script demonstrates how to run synchronization for your chat data

echo "=== WhatsApp Format Synchronizer - Example ==="
echo ""

# Chat directory path
CHAT_DIR="data/input/2025/1234567890___Test-Chat"

echo "📁 Target directory: $CHAT_DIR"
echo ""

# Check if directory exists
if [ ! -d "$CHAT_DIR" ]; then
    echo "❌ Error: Directory not found: $CHAT_DIR"
    exit 1
fi

# Check for JSON file
JSON_FILE="$CHAT_DIR/chats.json"
NATIVE_FILE="$CHAT_DIR/native_backups/WhatsApp Chat with +12 345 67 89 0.txt"

echo "🔍 Checking files:"
if [ -f "$JSON_FILE" ]; then
    echo "   ✅ JSON file found: $(wc -l < "$JSON_FILE") lines"
else
    echo "   ❌ JSON file missing"
fi

if [ -f "$NATIVE_FILE" ]; then
    echo "   ✅ Native file found: $(wc -l < "$NATIVE_FILE") lines"
else
    echo "   ❌ Native file missing"
fi

echo ""

# Check media directories
echo "📁 Media directories:"
for media_type in image document video audio; do
    media_dir="$CHAT_DIR/$media_type"
    if [ -d "$media_dir" ]; then
        file_count=$(find "$media_dir" -type f | wc -l)
        echo "   ✅ $media_type/: $file_count files"
    else
        echo "   ⚠️  $media_type/: directory not found"
    fi
done

echo ""
echo "🚀 To run synchronization, execute:"
echo "   node src/sync_formats.js $CHAT_DIR"
echo ""
echo "⚠️  WARNING: This will modify your files. Backups will be created automatically."
echo ""

# Uncomment the line below to actually run the synchronization
# node src/sync_formats.js "$CHAT_DIR"