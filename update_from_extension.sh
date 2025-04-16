#!/bin/bash

# Set to false to actually perform operations
DRY_RUN=false

# Directory where WhatsApp exports are stored
DOWNLOADS_DIR=~/Downloads

# Temporary directory for extraction
TMP_DIR="$DOWNLOADS_DIR/tmp"

# Base directory for storing chat data
DATA_INPUT_DIR="$HOME/git/whatsapp-backup/data/input"

# Clean up any existing tmp directory
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

# Check if there are any WhatsApp export zip files
zip_files=$(find "$DOWNLOADS_DIR" -maxdepth 1 -name "WA Download Chat Export_*_json.zip")
if [ -z "$zip_files" ]; then
    echo "No WhatsApp export zip files found in $DOWNLOADS_DIR"
    echo "Expected format: WA Download Chat Export_*_json.zip"
    exit 1
fi

# Process each WhatsApp export zip file
echo "Found $(echo "$zip_files" | wc -l | tr -d ' ') WhatsApp export zip file(s)"
echo "$zip_files" | while read -r zip_file; do
    echo "Processing: $zip_file"
    
    # Extract the chat name from the zip filename
    chat_name=$(basename "$zip_file" | sed -E 's/WA Download Chat Export_(.*)_json\.zip/\1/')
    echo "Chat name: $chat_name"
    
    # Create a subdirectory for this chat
    chat_tmp_dir="$TMP_DIR/$(basename "$zip_file" .zip)"
    mkdir -p "$chat_tmp_dir"
    
    # Extract the zip file
    unzip -o "$zip_file" -d "$chat_tmp_dir"
    
    # Find the JSON file in the extracted directory
    json_file=$(find "$chat_tmp_dir" -maxdepth 1 -name "*.json" | head -n 1)
    
    if [ -z "$json_file" ]; then
        echo "Error: No JSON file found in $chat_tmp_dir"
        continue
    fi
    
    echo "Found JSON file: $json_file"
    
    # Verify the JSON file is a valid WhatsApp chat export
    if ! grep -q "messageId" "$json_file"; then
        echo "Error: The JSON file does not appear to be a valid WhatsApp chat export"
        echo "Expected to find 'messageId' field in the JSON file"
        continue
    fi
    
    # Try to find a matching directory by chat name
    # Remove spaces, +, and convert to lowercase for better matching
    chat_name_clean=$(echo "$chat_name" | tr -d ' +' | tr '[:upper:]' '[:lower:]')
    chat_name_clean=${chat_name_clean//-/}
    
    # Find the corresponding directory in data/input by matching the chat name
    target_dir=""
    while IFS= read -r dir; do
        # Skip media subdirectories
        if [[ "$dir" == */image || "$dir" == */document || "$dir" == */sticker || "$dir" == */video || "$dir" == */useful ]]; then
            continue
        fi
        
        dir_name=$(basename "$dir" | tr '[:upper:]' '[:lower:]')
        dir_name=${dir_name//-/}
        
        if [[ "$dir_name" == *"$chat_name_clean"* ]]; then
            target_dir="$dir"
            echo "Found matching directory: $dir"
            break
        fi
    done < <(find "$DATA_INPUT_DIR" -type d -path "*/*___*")
    
    
    if [ -z "$target_dir" ]; then
        echo "Error: Could not find a matching directory in $DATA_INPUT_DIR for '$chat_name'"
        echo "Available directories:"
        find "$DATA_INPUT_DIR" -type d -path "*/*___*" | grep -v "/image\|/document\|/sticker\|/video\|/useful" | sort
        echo "Please create a directory for this chat or rename the zip file to match an existing directory."
        continue
    fi
    
    echo "Found target directory: $target_dir"
    
    # Copy the JSON file to a temporary location for processing
    cp "$json_file" "$TMP_DIR/current_export.json"
    
    # Update the target directory's chats.json file
    cd "$HOME/git/whatsapp-backup"
    
    # Create a temporary update script for this specific chat
    cat > "$TMP_DIR/update_current.js" << EOF
const fs = require('fs');

const currentJsonPath = '${target_dir}/chats.json';
const patchJson = JSON.parse(fs.readFileSync('${TMP_DIR}/current_export.json', 'utf8'));

let oldJson = [];
let oldMessageIds = new Set();

// Check if the target chats.json file exists
if (fs.existsSync(currentJsonPath)) {
    oldJson = JSON.parse(fs.readFileSync(currentJsonPath, 'utf8'));
    oldMessageIds = new Set(oldJson.map(({messageId}) => messageId));
} else {
    console.log('Target chats.json does not exist yet, creating a new file');
}

const filteredPatchJson = patchJson.filter(({messageId}) => !oldMessageIds.has(messageId));

const newJson = [...oldJson, ...filteredPatchJson];

fs.writeFileSync(currentJsonPath, JSON.stringify(newJson, null, 2));
EOF
    
    # Run the temporary update script
    if [ "$DRY_RUN" = true ]; then
        echo "[DRY RUN] Would update chats.json with new messages"
    else
        node "$TMP_DIR/update_current.js"
    fi
    
    # Copy media files if they exist
    for media_type in image document sticker video; do
        if [ -d "$chat_tmp_dir/$media_type" ]; then
            mkdir -p "$target_dir/$media_type"
            if [ "$DRY_RUN" = true ]; then
                echo "[DRY RUN] Would copy $media_type files from $chat_tmp_dir/$media_type/ to $target_dir/$media_type/"
            else
                cp -r "$chat_tmp_dir/$media_type/"* "$target_dir/$media_type/" 2>/dev/null || true
                echo "Copied $media_type files"
            fi
        fi
    done
    
    echo "Finished processing $zip_file"
    echo "-----------------------------------"
done

# Clean up
if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would clean up temporary directory"
else
    echo "Cleaning up temporary directory"
    rm -rf "$TMP_DIR"
    
    # Uncomment the following line if you want to remove the processed zip files
    # find "$DOWNLOADS_DIR" -maxdepth 1 -name "WA Download Chat Export_*_json.zip" -delete
fi

# Build web version and copy to data
if [ "$DRY_RUN" = true ]; then
    echo "[DRY RUN] Would run: npm run build-web"
    echo "[DRY RUN] Would run: ./copy_to_data.sh"
else
    npm run build-web
    ./copy_to_data.sh
fi

echo "All WhatsApp exports processed successfully!"
