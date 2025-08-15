#!/usr/bin/env node

/**
 * Debug script to understand why deduplication fails on real data
 */

const fs = require("fs");
const path = require("path");
const { parseJsonFile, parseNativeFile } = require("../src/sync_formats");

// Normalize sender name for consistent comparison between JSON and Native formats
// Import universal normalization functions from sync_formats.js
function buildSenderMapping(jsonMessages, nativeMessages) {
  const allMessages = [...jsonMessages, ...nativeMessages];
  const senderStats = new Map();
  const phonePatterns = /^\+?\d+[\s\d\-\(\)]*$/;

  allMessages.forEach((msg) => {
    const sender = (msg.formattedName || "").trim();
    const displayName = (msg.displayName || "").trim();
    const body = (msg.messageBody || "").trim();

    if (!senderStats.has(sender)) {
      senderStats.set(sender, {
        count: 0,
        displayNames: new Set(),
        isPhone: phonePatterns.test(sender),
        isYou: sender === "You",
        sampleMessages: [],
        avgMessageLength: 0,
      });
    }

    const stats = senderStats.get(sender);
    stats.count++;
    if (displayName) stats.displayNames.add(displayName);
    if (stats.sampleMessages.length < 5) {
      stats.sampleMessages.push(body.substring(0, 100));
    }
    stats.avgMessageLength = (stats.avgMessageLength + body.length) / 2;
  });

  const youStats = Array.from(senderStats.entries()).find(
    ([sender, stats]) => stats.isYou
  );
  const phoneStats = Array.from(senderStats.entries()).filter(
    ([sender, stats]) => stats.isPhone
  );
  const nameStats = Array.from(senderStats.entries()).filter(
    ([sender, stats]) => !stats.isPhone && !stats.isYou
  );

  const mapping = new Map();

  if (youStats) {
    mapping.set(youStats[0], "SELF");
    const youMessages = youStats[1].sampleMessages;
    for (const [sender, stats] of nameStats) {
      if (stats.count > 3) {
        const similarity = calculateMessageSimilarity(
          youMessages,
          stats.sampleMessages
        );
        if (similarity > 0.2) {
          mapping.set(sender, "SELF");
          break;
        }
      }
    }
  }

  phoneStats.forEach(([sender, stats]) => {
    const normalizedPhone = sender.replace(/[\s\-\(\)]/g, "");
    mapping.set(sender, normalizedPhone);
  });

  nameStats.forEach(([sender, stats]) => {
    if (mapping.has(sender)) return;
    if (stats.displayNames.size > 0) {
      const mostCommonDisplayName = Array.from(stats.displayNames)[0];
      mapping.set(sender, mostCommonDisplayName);
    } else {
      const shortName = extractShortName(sender);
      mapping.set(sender, shortName);
    }
  });

  return mapping;
}

function calculateMessageSimilarity(messages1, messages2) {
  if (!messages1.length || !messages2.length) return 0;
  const words1 = new Set(messages1.join(" ").toLowerCase().split(/\s+/));
  const words2 = new Set(messages2.join(" ").toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter((word) => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

function extractShortName(fullName) {
  let name = fullName;
  name = name.replace(/[@.]\w+/g, "");
  name = name.replace(
    /\b(mock|interview|eng|frontend|backend|chat|with)\b/gi,
    ""
  );
  const words = name.split(/\s+/).filter((word) => word.length > 2);
  if (words.length > 0) {
    return words[0];
  }
  return fullName.length > 20 ? fullName.substring(0, 20) + "..." : fullName;
}

function normalizeSenderName(msg, senderMapping = null) {
  const sender = (msg.formattedName || "").trim();

  if (senderMapping && senderMapping.has(sender)) {
    return senderMapping.get(sender);
  }

  if (sender === "You") {
    return "SELF";
  }

  if (/^\+?\d+[\s\d\-\(\)]*$/.test(sender)) {
    return sender.replace(/[\s\-\(\)]/g, "");
  }

  if (msg.displayName && msg.displayName.trim() !== "") {
    return msg.displayName.trim();
  }

  return extractShortName(sender);
}

function createMessageHash(msg, senderMapping = null) {
  const normalizedBody = (msg.messageBody || "").trim();
  const normalizedSender = normalizeSenderName(msg, senderMapping);
  const normalizedType = msg.messageType || "chat";

  const content = `${normalizedSender}:${normalizedType}:${normalizedBody}`;

  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return hash.toString();
}

function createTimeAwareHash(msg, senderMapping = null) {
  const normalizedBody = (msg.messageBody || "").trim();
  const normalizedSender = normalizeSenderName(msg, senderMapping);
  const normalizedType = msg.messageType || "chat";

  const roundedTimestamp = Math.floor(msg.timestamp / 300000) * 300000;

  return `${normalizedSender}:${normalizedType}:${normalizedBody}:${roundedTimestamp}`;
}

function debugDeduplication(chatDir) {
  console.log("=== Debug Deduplication ===\n");

  const jsonPath = path.join(chatDir, "chats.json");
  const nativeDir = path.join(chatDir, "native_backups");

  // Find native file
  let nativePath = null;
  if (fs.existsSync(nativeDir)) {
    const files = fs.readdirSync(nativeDir);
    const chatFiles = files.filter((file) =>
      file.match(/^WhatsApp Chat with \+\d+.*\.txt$/)
    );

    const testPatterns = [/\+12 345 67 89 0/, /\+1234567890/, /\+9876543210/];
    let chatFile = chatFiles.find(
      (file) => !testPatterns.some((pattern) => pattern.test(file))
    );

    if (!chatFile && chatFiles.length > 0) {
      chatFile = chatFiles[0];
    }

    if (chatFile) {
      nativePath = path.join(nativeDir, chatFile);
    }
  }

  if (!fs.existsSync(jsonPath)) {
    console.error("❌ JSON file not found");
    return;
  }

  if (!nativePath || !fs.existsSync(nativePath)) {
    console.error("❌ Native file not found");
    return;
  }

  console.log(`📄 JSON file: ${jsonPath}`);
  console.log(`📄 Native file: ${nativePath}\n`);

  // Parse files
  const jsonMessages = parseJsonFile(jsonPath);
  const nativeMessages = parseNativeFile(nativePath);

  console.log(`📊 JSON messages: ${jsonMessages.length}`);
  console.log(`📊 Native messages: ${nativeMessages.length}\n`);

  // Build sender mapping for universal deduplication
  console.log("🔍 Building universal sender mapping...");
  const senderMapping = buildSenderMapping(jsonMessages, nativeMessages);
  console.log(`📋 Detected ${senderMapping.size} sender mappings:`);
  Array.from(senderMapping.entries())
    .slice(0, 5)
    .forEach(([original, normalized]) => {
      console.log(`   "${original}" → "${normalized}"`);
    });
  if (senderMapping.size > 5) {
    console.log(`   ... and ${senderMapping.size - 5} more`);
  }
  console.log("");

  // Analyze first few messages from each source
  console.log("🔍 Analyzing first 5 messages from each source:\n");

  console.log("JSON Messages:");
  jsonMessages.slice(0, 5).forEach((msg, i) => {
    const contentHash = createMessageHash(msg, senderMapping);
    const timeHash = createTimeAwareHash(msg, senderMapping);
    console.log(
      `${i + 1}. [${msg.source || "json"}] ${
        msg.formattedName
      }: ${msg.messageBody?.substring(0, 40)}...`
    );
    console.log(`   Time: ${msg.messageTime} (${msg.timestamp})`);
    console.log(`   Content Hash: ${contentHash}`);
    console.log(`   Time Hash: ${timeHash.substring(0, 60)}...`);
    console.log("");
  });

  console.log("Native Messages:");
  nativeMessages.slice(0, 5).forEach((msg, i) => {
    const contentHash = createMessageHash(msg, senderMapping);
    const timeHash = createTimeAwareHash(msg, senderMapping);
    console.log(
      `${i + 1}. [${msg.source || "native"}] ${
        msg.formattedName
      }: ${msg.messageBody?.substring(0, 40)}...`
    );
    console.log(`   Time: ${msg.messageTime} (${msg.timestamp})`);
    console.log(`   Content Hash: ${contentHash}`);
    console.log(`   Time Hash: ${timeHash.substring(0, 60)}...`);
    console.log("");
  });

  // Look for potential duplicates
  console.log("🔍 Looking for potential duplicates:\n");

  const jsonHashes = new Set();
  const duplicateCandidates = [];

  // Build hash set from JSON messages
  jsonMessages.forEach((msg) => {
    const contentHash = createMessageHash(msg, senderMapping);
    jsonHashes.add(contentHash);
  });

  // Check native messages against JSON hashes
  nativeMessages.forEach((msg, i) => {
    const contentHash = createMessageHash(msg, senderMapping);
    if (jsonHashes.has(contentHash)) {
      duplicateCandidates.push({
        index: i,
        message: msg,
        hash: contentHash,
      });
    }
  });

  console.log(
    `Found ${duplicateCandidates.length} potential duplicates in native messages:`
  );
  duplicateCandidates.slice(0, 10).forEach((dup) => {
    console.log(
      `- ${dup.message.formattedName}: ${dup.message.messageBody?.substring(
        0,
        50
      )}...`
    );
  });

  if (duplicateCandidates.length === 0) {
    console.log(
      "❌ No duplicates found! This explains why messages keep growing."
    );
    console.log(
      "The hash function or message parsing is not working correctly."
    );
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const chatDir = args[0] || "data/input/2025/1234567890___Test-Chat-Directory";
  debugDeduplication(chatDir);
}

module.exports = { debugDeduplication };
