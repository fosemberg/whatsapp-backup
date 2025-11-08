#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

/**
 * WhatsApp Native Backup Appender
 * 
 * This script processes all zip files in native_backups_new folders,
 * extracts them, and appends their content to existing native backup files.
 * Then runs sync to merge with JSON format.
 */

class NativeBackupAppender {
    constructor() {
        this.processedCount = 0;
        this.errorCount = 0;
        this.tempDir = './temp_extract';
    }

    /**
     * Main entry point - processes all chat directories
     */
    async run() {
        console.log('=== WhatsApp Native Backup Appender ===\n');

        try {
            // Find all chat directories
            const chatDirectories = await this.findChatDirectories();
            
            if (chatDirectories.length === 0) {
                console.log('❌ No chat directories found with native_backups_new folders');
                return;
            }

            console.log(`📁 Found ${chatDirectories.length} chat directories to process:\n`);
            
            for (const chatDir of chatDirectories) {
                console.log(`🔄 Processing: ${path.basename(chatDir)}`);
                await this.processChatDirectory(chatDir);
                console.log('');
            }

            console.log(`🎉 Processing complete!`);
            console.log(`✅ Successfully processed: ${this.processedCount} directories`);
            if (this.errorCount > 0) {
                console.log(`❌ Errors encountered: ${this.errorCount} directories`);
            }

        } catch (error) {
            console.error('❌ Fatal error:', error.message);
            process.exit(1);
        }
    }

    /**
     * Find all directories containing native_backups_new folders
     */
    async findChatDirectories() {
        const dataInputPath = './data/input';
        const chatDirectories = [];

        if (!fs.existsSync(dataInputPath)) {
            throw new Error(`Data input directory not found: ${dataInputPath}`);
        }

        // Look in year directories
        const yearDirs = fs.readdirSync(dataInputPath)
            .filter(item => fs.statSync(path.join(dataInputPath, item)).isDirectory());

        for (const yearDir of yearDirs) {
            const yearPath = path.join(dataInputPath, yearDir);
            const chatDirs = fs.readdirSync(yearPath)
                .filter(item => fs.statSync(path.join(yearPath, item)).isDirectory());

            for (const chatDir of chatDirs) {
                const chatPath = path.join(yearPath, chatDir);
                const newBackupsPath = path.join(chatPath, 'native_backups_new');
                
                if (fs.existsSync(newBackupsPath)) {
                    chatDirectories.push(chatPath);
                }
            }
        }

        return chatDirectories;
    }

    /**
     * Process a single chat directory
     */
    async processChatDirectory(chatDir) {
        try {
            const newBackupsPath = path.join(chatDir, 'native_backups_new');
            const nativeBackupsPath = path.join(chatDir, 'native_backups');

            // Ensure native_backups directory exists
            if (!fs.existsSync(nativeBackupsPath)) {
                fs.mkdirSync(nativeBackupsPath, { recursive: true });
                console.log(`  📁 Created native_backups directory`);
            }

            // Get all zip files
            const zipFiles = fs.readdirSync(newBackupsPath)
                .filter(file => file.endsWith('.zip'))
                .sort(); // Process in alphabetical order

            if (zipFiles.length === 0) {
                console.log(`  ℹ️  No zip files found in native_backups_new`);
                return;
            }

            console.log(`  📦 Found ${zipFiles.length} zip files to process`);

            // Process each zip file
            for (const zipFile of zipFiles) {
                await this.processZipFile(chatDir, zipFile);
            }

            // Run sync after processing all zips
            console.log(`  🔄 Running format synchronization...`);
            await this.runSync(chatDir);

            this.processedCount++;
            console.log(`  ✅ Successfully processed ${path.basename(chatDir)}`);

        } catch (error) {
            console.error(`  ❌ Error processing ${path.basename(chatDir)}: ${error.message}`);
            this.errorCount++;
        }
    }

    /**
     * Process a single zip file
     */
    async processZipFile(chatDir, zipFile) {
        const zipPath = path.join(chatDir, 'native_backups_new', zipFile);
        const nativeBackupsPath = path.join(chatDir, 'native_backups');
        
        try {
            // Create temp directory for extraction
            const tempExtractPath = path.join(chatDir, this.tempDir);
            if (fs.existsSync(tempExtractPath)) {
                fs.rmSync(tempExtractPath, { recursive: true, force: true });
            }
            fs.mkdirSync(tempExtractPath, { recursive: true });

            // Extract zip file
            console.log(`    📦 Extracting: ${zipFile}`);
            await this.extractZip(zipPath, tempExtractPath);

            // Find the chat text file in extracted content
            const chatTextFile = await this.findChatTextFile(tempExtractPath);
            if (!chatTextFile) {
                console.log(`    ⚠️  No chat text file found in ${zipFile}`);
                return;
            }

            // Find target file in native_backups
            const targetFile = await this.findTargetChatFile(nativeBackupsPath, chatTextFile);
            
            // Append content
            await this.appendChatContent(chatTextFile, targetFile);

            // Copy attachments
            await this.copyAttachments(tempExtractPath, nativeBackupsPath);

            // Clean up temp directory
            fs.rmSync(tempExtractPath, { recursive: true, force: true });

            console.log(`    ✅ Processed: ${zipFile}`);

        } catch (error) {
            console.error(`    ❌ Error processing ${zipFile}: ${error.message}`);
            // Clean up temp directory on error
            const tempExtractPath = path.join(chatDir, this.tempDir);
            if (fs.existsSync(tempExtractPath)) {
                fs.rmSync(tempExtractPath, { recursive: true, force: true });
            }
            throw error;
        }
    }

    /**
     * Extract zip file using system unzip command
     */
    async extractZip(zipPath, extractPath) {
        try {
            // Use system unzip command (works on macOS and Linux)
            await exec(`unzip -q "${zipPath}" -d "${extractPath}"`);
        } catch (error) {
            throw new Error(`Failed to extract ${path.basename(zipPath)}: ${error.message}`);
        }
    }

    /**
     * Find chat text file in extracted content
     */
    async findChatTextFile(extractPath) {
        const findTextFile = (dir) => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isFile()) {
                    // Look for WhatsApp chat files
                    if (item.startsWith('WhatsApp Chat with') && item.endsWith('.txt')) {
                        return itemPath;
                    }
                    // Also check for generic chat.txt files
                    if (item === 'chat.txt' || item.toLowerCase().includes('chat')) {
                        return itemPath;
                    }
                } else if (stat.isDirectory()) {
                    // Recursively search subdirectories
                    const found = findTextFile(itemPath);
                    if (found) return found;
                }
            }
            return null;
        };

        return findTextFile(extractPath);
    }

    /**
     * Find target chat file in native_backups directory
     */
    async findTargetChatFile(nativeBackupsPath, sourceChatFile) {
        const sourceFileName = path.basename(sourceChatFile);
        
        // First, try to find exact match
        const exactMatch = path.join(nativeBackupsPath, sourceFileName);
        if (fs.existsSync(exactMatch)) {
            return exactMatch;
        }

        // If no exact match, find any file starting with "WhatsApp Chat with"
        const files = fs.readdirSync(nativeBackupsPath)
            .filter(file => file.startsWith('WhatsApp Chat with') && file.endsWith('.txt'));

        if (files.length > 0) {
            // Use the first matching file
            const targetFile = path.join(nativeBackupsPath, files[0]);
            console.log(`    📄 Using existing chat file: ${files[0]}`);
            return targetFile;
        }

        // If no existing file, create new one with source filename
        const newFile = path.join(nativeBackupsPath, sourceFileName);
        console.log(`    📄 Creating new chat file: ${sourceFileName}`);
        return newFile;
    }

    /**
     * Append chat content from source to target file
     */
    async appendChatContent(sourceFile, targetFile) {
        try {
            const sourceContent = fs.readFileSync(sourceFile, 'utf8');
            
            // Skip if source is empty
            if (!sourceContent.trim()) {
                console.log(`    ⚠️  Source file is empty, skipping content append`);
                return;
            }

            // Create target file if it doesn't exist
            if (!fs.existsSync(targetFile)) {
                fs.writeFileSync(targetFile, '');
            }

            // Append content with newline separator
            const targetContent = fs.readFileSync(targetFile, 'utf8');
            const separator = targetContent.trim() ? '\n' : '';
            
            fs.appendFileSync(targetFile, separator + sourceContent);
            
            const sourceLines = sourceContent.split('\n').filter(line => line.trim()).length;
            console.log(`    📝 Appended ${sourceLines} lines to ${path.basename(targetFile)}`);

        } catch (error) {
            throw new Error(`Failed to append chat content: ${error.message}`);
        }
    }

    /**
     * Copy attachments from extracted content to native_backups
     */
    async copyAttachments(extractPath, nativeBackupsPath) {
        const copyAttachmentsFromDir = (sourceDir) => {
            if (!fs.existsSync(sourceDir)) return;

            const items = fs.readdirSync(sourceDir);
            let copiedCount = 0;

            for (const item of items) {
                const sourcePath = path.join(sourceDir, item);
                const stat = fs.statSync(sourcePath);

                if (stat.isFile()) {
                    // Skip text files (they're handled separately)
                    if (item.endsWith('.txt')) continue;

                    // Copy attachment to native_backups
                    const targetPath = path.join(nativeBackupsPath, item);
                    
                    try {
                        fs.copyFileSync(sourcePath, targetPath);
                        copiedCount++;
                    } catch (error) {
                        console.log(`    ⚠️  Failed to copy ${item}: ${error.message}`);
                    }
                } else if (stat.isDirectory()) {
                    // Recursively copy from subdirectories
                    copiedCount += copyAttachmentsFromDir(sourcePath);
                }
            }

            return copiedCount;
        };

        const copiedCount = copyAttachmentsFromDir(extractPath);
        if (copiedCount > 0) {
            console.log(`    📎 Copied ${copiedCount} attachment files`);
        }
    }

    /**
     * Run sync_formats.js on the chat directory
     */
    async runSync(chatDir) {
        try {
            const syncScript = path.join(__dirname, 'sync_formats.js');
            await exec(`node "${syncScript}" "${chatDir}"`);
            console.log(`    ✅ Format synchronization completed`);
        } catch (error) {
            console.error(`    ⚠️  Sync warning: ${error.message}`);
            // Don't throw error as sync issues shouldn't stop the main process
        }
    }
}

// Run the script if called directly
if (require.main === module) {
    const appender = new NativeBackupAppender();
    appender.run().catch(error => {
        console.error('❌ Unhandled error:', error);
        process.exit(1);
    });
}

module.exports = NativeBackupAppender;