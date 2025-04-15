#!/bin/bash

# Source and destination directories
from="./data"
to="../whatsapp-backup-data"

# Find all year directories in the source input directory
year_dirs=$(find "$from/input" -maxdepth 1 -type d -regex ".*/[0-9][0-9][0-9][0-9]$" -exec basename {} \;)

if [ -z "$year_dirs" ]; then
    echo "No year directories found in $from/input"
    exit 1
fi

echo "Found year directories: $year_dirs"

# Process each year directory
for year in $year_dirs; do
    echo "Processing year: $year"
    
    # Create destination directories if they don't exist
    mkdir -p "$to/input/$year"
    mkdir -p "$to/output/web/$year"
    
    # Copy input files, preserving document, sticker, video directories
    # Using rsync with --update to only copy newer files
    # --recursive: recurse into directories
    # --update: skip files that are newer on the receiver
    # --verbose: show what's being done
    # --exclude: exclude specific directories that should be preserved
    echo "Syncing input directory for $year..."
    rsync --recursive --update --verbose \
        "$from/input/$year/" "$to/input/$year/"
    
    # Copy output web files
    echo "Syncing output web directory for $year..."
    rsync --recursive --update --verbose \
        "$from/output/web/$year/" "$to/output/web/$year/"
done

# Commit and push changes
echo "Committing changes..."
cd "$to"
git add .
git status
git diff | cat

# Create a more descriptive commit message with the years that were updated
commit_msg="Update WhatsApp backup data for years: $year_dirs"
git commit -m "$commit_msg"
git push

# Return to original directory
cd ..
cd whatsapp-backup

echo "Backup completed successfully!"
