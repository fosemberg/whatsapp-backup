#!/usr/bin/env node

/**
 * Summary script showing sync_formats.js results
 */

const fs = require("fs");
const path = require("path");

function showSummary(chatDir) {
  console.log("=== WhatsApp Sync Summary ===\n");

  const jsonPath = path.join(chatDir, "chats.json");
  // Find WhatsApp Chat file dynamically by pattern
  // Prioritize non-test phone numbers (avoid +12 345 67 89 0 and similar test patterns)
  const nativeDir = path.join(chatDir, "native_backups");
  let nativePath = null;
  if (fs.existsSync(nativeDir)) {
    const files = fs.readdirSync(nativeDir);
    const chatFiles = files.filter((file) =>
      file.match(/^WhatsApp Chat with \+\d+.*\.txt$/)
    );

    // First try to find non-test numbers (avoid common test patterns)
    const testPatterns = [/\+12 345 67 89 0/, /\+1234567890/, /\+9876543210/];
    let chatFile = chatFiles.find(
      (file) => !testPatterns.some((pattern) => pattern.test(file))
    );

    // If no non-test file found, use any chat file
    if (!chatFile && chatFiles.length > 0) {
      chatFile = chatFiles[0];
    }

    if (chatFile) {
      nativePath = path.join(nativeDir, chatFile);
    }
  }

  if (fs.existsSync(jsonPath)) {
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    console.log(`📄 JSON format: ${jsonData.length} messages`);

    // Show date range
    if (jsonData.length > 0) {
      const firstMsg = jsonData[0];
      const lastMsg = jsonData[jsonData.length - 1];
      console.log(
        `   Date range: ${firstMsg.messageTime} → ${lastMsg.messageTime}`
      );
    }
  }

  if (fs.existsSync(nativePath)) {
    const nativeContent = fs.readFileSync(nativePath, "utf8");
    const lines = nativeContent
      .split("\n")
      .filter(
        (line) =>
          line.trim() && !line.includes("encrypted") && line.includes(" - ")
      );
    console.log(`📄 Native format: ${lines.length} message lines`);
  }

  // Check media directories
  const mediaTypes = ["image", "document", "video", "audio"];
  let totalFiles = 0;

  console.log("\n📁 Media files:");
  mediaTypes.forEach((type) => {
    const dir = path.join(chatDir, type);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      console.log(`   ${type}/: ${files.length} files`);
      totalFiles += files.length;
    }
  });

  console.log(`\n📊 Total: ${totalFiles} media files`);

  // Check backups
  const backups = fs
    .readdirSync(chatDir)
    .concat(
      fs.existsSync(path.join(chatDir, "native_backups"))
        ? fs.readdirSync(path.join(chatDir, "native_backups"))
        : []
    )
    .filter((file) => file.includes(".backup."));

  if (backups.length > 0) {
    console.log(`\n💾 Backups created: ${backups.length} files`);
  }

  console.log("\n✅ Synchronization complete!");
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const chatDir = args[0] || "data/input/2025/1234567890___Test-Chat";
  showSummary(chatDir);
}

module.exports = { showSummary };
