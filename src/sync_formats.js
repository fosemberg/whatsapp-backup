#!/usr/bin/env node

/**
 * WhatsApp Format Synchronizer
 * Synchronizes JSON and native WhatsApp formats bidirectionally
 * Maintains chronological order and handles different date formats
 * Usage: node src/sync_formats.js <chat_directory>
 */

const fs = require("fs");
const path = require("path");
const { convertJsonToNative } = require("./json-to-native-converter");
const { convertNativeToJson } = require("./native-to-json-converter");

// Regular expressions for different date formats in native file
const DATE_FORMATS = {
  US: /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})/,
  EU: /^\[(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2}):(\d{2})\]/,
  EU_NO_BRACKETS: /^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2}):(\d{2})/,
  MESSAGE_US: /^(\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}) - (.+?): (.*)$/,
  MESSAGE_EU: /^\[(\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2})\] (.+?): (.*)$/,
  MESSAGE_EU_NO_BRACKETS:
    /^(\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2}) (.+?): (.*)$/,
  SYSTEM: /^(\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}) - (.*)$/,
};

// Normalize various date formats to standard ISO format
function normalizeDate(dateStr) {
  let date;

  // Try US format: "3/4/25, 0:50"
  const usMatch = dateStr.match(DATE_FORMATS.US);
  if (usMatch) {
    let [, month, day, year, hour, minute] = usMatch;

    // Handle 2-digit years
    if (year.length === 2) {
      year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    }

    date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );
  }

  // Try EU format: "[20.06.2025, 12:29:30]"
  const euMatch = dateStr.match(DATE_FORMATS.EU);
  if (euMatch) {
    const [, day, month, year, hour, minute, second] = euMatch;
    date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }

  // Try EU format without brackets: "04.07.2025, 20:27:42"
  const euNoBracketsMatch = dateStr.match(DATE_FORMATS.EU_NO_BRACKETS);
  if (euNoBracketsMatch) {
    const [, day, month, year, hour, minute, second] = euNoBracketsMatch;
    date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }

  // Try ISO format: "2025-02-28 18:50:57"
  if (!date && dateStr.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
    date = new Date(dateStr.replace(" ", "T"));
  }

  if (!date || isNaN(date.getTime())) {
    console.warn(`Could not parse date: ${dateStr}`);
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }

  return date.toISOString().slice(0, 19).replace("T", " ");
}

// Parse native WhatsApp file into structured messages
function parseNativeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const messages = [];
  let currentMessage = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Try to match message lines with different date formats
    let messageMatch =
      line.match(DATE_FORMATS.MESSAGE_US) ||
      line.match(DATE_FORMATS.MESSAGE_EU) ||
      line.match(DATE_FORMATS.MESSAGE_EU_NO_BRACKETS);

    if (messageMatch) {
      // Save previous message if exists
      if (currentMessage) {
        messages.push(currentMessage);
      }

      const [, dateStr, sender, content] = messageMatch;
      const normalizedDate = normalizeDate(dateStr);

      // Determine message type and extract filename if attachment
      let messageType = "chat";
      let messageBody = content;
      let isAttachment = false;

      if (content.includes("(file attached)")) {
        const filename = content.replace(" (file attached)", "");
        const ext = path.extname(filename).toLowerCase();

        // Determine type by extension
        if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
          messageType = "image";
        } else if ([".mp4", ".avi", ".mov", ".mkv", ".mpeg"].includes(ext)) {
          messageType = "video";
        } else if ([".mp3", ".wav", ".ogg", ".m4a"].includes(ext)) {
          messageType = "audio";
        } else if (ext === ".pdf") {
          messageType = "pdf";
        } else {
          messageType = "document";
        }

        messageBody = filename;
        isAttachment = true;
      } else if (content.includes("<attached:")) {
        // Handle format like "‎<attached: 00002933-PHOTO-2025-06-20-12-34-29.jpg>"
        const attachMatch = content.match(/<attached:\s*([^>]+)>/);
        if (attachMatch) {
          messageBody = attachMatch[1];
          messageType = "image"; // Assume photo for now
          isAttachment = true;
        }
      }

      // Extract sender info
      let country, phoneNum, formattedName, displayName;

      if (sender.startsWith("+")) {
        // Phone number format
        phoneNum = sender.replace(/\s/g, "");
        formattedName = sender;

        // Basic country detection
        if (phoneNum.startsWith("+34")) country = "Spain";
        else if (phoneNum.startsWith("+7")) country = "Russia";
        else country = "Unknown";
      } else if (sender.startsWith("~")) {
        // Display name format like "~Name"
        displayName = sender.substring(1);
        formattedName = displayName;
        country = "Unknown";
      } else {
        // Regular name
        displayName = sender;
        formattedName = sender;
        country = "Unknown";
      }

      // Determine original date format for preservation based on original line
      let originalDateFormat = "US"; // Default to US format
      if (line.match(DATE_FORMATS.MESSAGE_EU)) {
        originalDateFormat = "EU";
      } else if (line.match(DATE_FORMATS.MESSAGE_EU_NO_BRACKETS)) {
        originalDateFormat = "EU_NO_BRACKETS";
      }

      currentMessage = {
        country: country || "Unknown",
        phoneNum: phoneNum || null,
        formattedName: formattedName,
        messageTime: normalizedDate,
        messageType: messageType,
        messageBody: messageBody,
        messageId: generateMessageId(sender, normalizedDate),
        timestamp: new Date(normalizedDate).getTime(),
        source: "native",
        isAttachment,
        originalDateFormat, // Preserve original date format
      };

      if (displayName) {
        currentMessage.displayName = displayName;
      }
    } else {
      // Check for system messages
      const systemMatch = line.match(DATE_FORMATS.SYSTEM);
      if (systemMatch) {
        // Skip system messages
        continue;
      }

      // Multi-line message continuation
      if (currentMessage && !line.includes(" - ")) {
        if (currentMessage.messageType !== "chat") {
          // If current message is attachment, create new chat message
          messages.push(currentMessage);

          currentMessage = {
            country: currentMessage.country,
            phoneNum: currentMessage.phoneNum,
            formattedName: currentMessage.formattedName,
            messageTime: currentMessage.messageTime,
            messageType: "chat",
            messageBody: line,
            messageId: generateMessageId(
              currentMessage.formattedName,
              currentMessage.messageTime,
              true
            ),
            timestamp: currentMessage.timestamp,
            source: "native",
            isAttachment: false,
            originalDateFormat: currentMessage.originalDateFormat, // Preserve format
          };

          if (currentMessage.displayName) {
            currentMessage.displayName = currentMessage.displayName;
          }
        } else {
          currentMessage.messageBody += "\n" + line;
        }
      }
    }
  }

  // Add last message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

// Parse JSON file into structured messages
function parseJsonFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const messages = JSON.parse(content);

  return messages.map((msg) => ({
    ...msg,
    timestamp: new Date(msg.messageTime).getTime(),
    source: "json",
    isAttachment: msg.messageType !== "chat",
    originalDateFormat: "US", // JSON messages default to US format for display
  }));
}

// Generate message ID without hardcoded sender detection
function generateMessageId(sender, timestamp, isMultiLine = false) {
  const hash = Buffer.from(
    `${sender}_${timestamp}_${Math.random()}_${isMultiLine}`
  )
    .toString("hex")
    .substring(0, 16);

  // Smart detection: "You" or similar self-references indicate outgoing messages
  const isOutgoing =
    sender === "You" ||
    sender === "SELF" ||
    sender.toLowerCase().includes("you") ||
    sender.toLowerCase() === "me";

  const prefix = isOutgoing ? "true" : "false";
  return `${prefix}_sync@c.us_${hash.toUpperCase()}`;
}

// Cache for sender name mappings to avoid recalculation
let senderNormalizationCache = new Map();

// Analyze all messages to build sender mapping automatically
function buildSenderMapping(jsonMessages, nativeMessages) {
  const allMessages = [...jsonMessages, ...nativeMessages];
  const senderStats = new Map();
  const phonePatterns = /^\+?\d+[\s\d\-\(\)]*$/;

  // Collect statistics about senders and their messages
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

  // Find "You" equivalent in other format
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

  // Handle "You" mapping
  if (youStats) {
    mapping.set(youStats[0], "SELF");

    // Try to find corresponding sender in other format
    // Look for non-phone, non-You senders with similar message patterns
    const youMessages = youStats[1].sampleMessages;
    for (const [sender, stats] of nameStats) {
      if (stats.count > 3) {
        // Has enough messages to compare
        const similarity = calculateMessageSimilarity(
          youMessages,
          stats.sampleMessages
        );
        if (similarity > 0.2) {
          // If messages are similar, might be the same person
          mapping.set(sender, "SELF");
          break;
        }
      }
    }
  }

  // Handle phone number normalization
  phoneStats.forEach(([sender, stats]) => {
    // Normalize phone format: remove spaces, keep only digits and +
    const normalizedPhone = sender.replace(/[\s\-\(\)]/g, "");
    mapping.set(sender, normalizedPhone);
  });

  // Handle display names
  nameStats.forEach(([sender, stats]) => {
    if (mapping.has(sender)) return; // Already mapped

    // Prefer display name if available
    if (stats.displayNames.size > 0) {
      const mostCommonDisplayName = Array.from(stats.displayNames)[0];
      mapping.set(sender, mostCommonDisplayName);
    } else {
      // Try to extract shorter name from long formatted names
      const shortName = extractShortName(sender);
      mapping.set(sender, shortName);
    }
  });

  return mapping;
}

// Calculate similarity between message sets
function calculateMessageSimilarity(messages1, messages2) {
  if (!messages1.length || !messages2.length) return 0;

  const words1 = new Set(messages1.join(" ").toLowerCase().split(/\s+/));
  const words2 = new Set(messages2.join(" ").toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((word) => words2.has(word)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// Extract shorter name from long formatted names
function extractShortName(fullName) {
  // Remove common patterns that make names long
  let name = fullName;

  // Remove email-like patterns
  name = name.replace(/[@.]\w+/g, "");

  // Remove common suffixes/prefixes
  name = name.replace(
    /\b(mock|interview|eng|frontend|backend|chat|with)\b/gi,
    ""
  );

  // Take first meaningful word (longer than 2 chars)
  const words = name.split(/\s+/).filter((word) => word.length > 2);
  if (words.length > 0) {
    return words[0];
  }

  // If no good word found, return original but truncated
  return fullName.length > 20 ? fullName.substring(0, 20) + "..." : fullName;
}

// Smart sender name normalization without hardcoded values
function normalizeSenderName(msg, senderMapping = null) {
  const sender = (msg.formattedName || "").trim();

  // Use cached mapping if available
  if (senderMapping && senderMapping.has(sender)) {
    return senderMapping.get(sender);
  }

  // Fallback: basic normalization without hardcoded names
  if (sender === "You") {
    return "SELF";
  }

  // Basic phone normalization
  if (/^\+?\d+[\s\d\-\(\)]*$/.test(sender)) {
    return sender.replace(/[\s\-\(\)]/g, "");
  }

  // Use display name if available
  if (msg.displayName && msg.displayName.trim() !== "") {
    return msg.displayName.trim();
  }

  // Extract short name from long names
  return extractShortName(sender);
}

// Create a stable hash for message content to ensure proper deduplication
function createMessageHash(msg, senderMapping = null) {
  // Normalize message content for consistent hashing
  const normalizedBody = (msg.messageBody || "").trim();
  const normalizedSender = normalizeSenderName(msg, senderMapping);
  const normalizedType = msg.messageType || "chat";

  // Create content-based hash WITHOUT timestamp for better deduplication
  const content = `${normalizedSender}:${normalizedType}:${normalizedBody}`;

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return hash.toString();
}

// Create a time-aware hash for messages (includes rounded timestamp)
function createTimeAwareHash(msg, senderMapping = null) {
  const normalizedBody = (msg.messageBody || "").trim();
  const normalizedSender = normalizeSenderName(msg, senderMapping);
  const normalizedType = msg.messageType || "chat";

  // Round timestamp to nearest 5 minutes for time tolerance
  const roundedTimestamp = Math.floor(msg.timestamp / 300000) * 300000;

  return `${normalizedSender}:${normalizedType}:${normalizedBody}:${roundedTimestamp}`;
}

// Merge messages from both sources, removing duplicates and maintaining chronological order
function mergeMessages(jsonMessages, nativeMessages) {
  console.log(
    `Merging ${jsonMessages.length} JSON messages with ${nativeMessages.length} native messages...`
  );

  // Build intelligent sender mapping based on message analysis
  console.log("🔍 Analyzing sender patterns for smart deduplication...");
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

  const seenContentHashes = new Set();
  const seenTimeAwareHashes = new Set();
  const mergedMessages = [];

  // Combine all messages and sort by timestamp
  const allMessages = [...jsonMessages, ...nativeMessages].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  let duplicatesRemoved = 0;

  for (const msg of allMessages) {
    // Create different types of hashes for comprehensive deduplication
    const contentHash = createMessageHash(msg, senderMapping);
    const timeAwareHash = createTimeAwareHash(msg, senderMapping);

    // Check for content-based duplicates (same content, sender, type)
    if (seenContentHashes.has(contentHash)) {
      console.log(
        `Skipping content duplicate: ${msg.messageBody?.substring(0, 30)}...`
      );
      duplicatesRemoved++;
      continue;
    }

    // Check for time-aware duplicates (same content + time window)
    if (seenTimeAwareHashes.has(timeAwareHash)) {
      console.log(
        `Skipping time-aware duplicate: ${msg.messageBody?.substring(0, 30)}...`
      );
      duplicatesRemoved++;
      continue;
    }

    // Add message if it's unique
    seenContentHashes.add(contentHash);
    seenTimeAwareHashes.add(timeAwareHash);
    mergedMessages.push(msg);
  }

  console.log(
    `Merged result: ${mergedMessages.length} unique messages (removed ${duplicatesRemoved} duplicates)`
  );
  return mergedMessages;
}

// Convert merged messages back to JSON format
function messagesToJson(messages) {
  return messages.map((msg) => ({
    country: msg.country,
    phoneNum: msg.phoneNum,
    formattedName: msg.formattedName,
    ...(msg.displayName && { displayName: msg.displayName }),
    messageTime: msg.messageTime,
    messageType: msg.messageType,
    messageBody: msg.messageBody,
    messageId: msg.messageId,
  }));
}

// Convert merged messages to native format
function messagesToNative(messages) {
  let nativeContent = "";

  if (messages.length > 0) {
    const firstDate = convertToNativeDate(messages[0].messageTime);
    nativeContent += `${firstDate} - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. Learn more.\n`;
    nativeContent += `${firstDate} - \n`;
  }

  for (const msg of messages) {
    const nativeDate = convertToNativeDate(
      msg.messageTime,
      msg.originalDateFormat
    );
    const senderName = msg.displayName || msg.formattedName || msg.phoneNum;
    let line = "";

    if (msg.messageType === "chat") {
      if (
        msg.originalDateFormat === "EU" ||
        msg.originalDateFormat === "EU_NO_BRACKETS"
      ) {
        line = `${nativeDate} ${senderName}: ${msg.messageBody}`;
      } else {
        line = `${nativeDate} - ${senderName}: ${msg.messageBody}`;
      }
    } else {
      if (
        msg.originalDateFormat === "EU" ||
        msg.originalDateFormat === "EU_NO_BRACKETS"
      ) {
        line = `${nativeDate} ${senderName}: ${msg.messageBody} (file attached)`;
      } else {
        line = `${nativeDate} - ${senderName}: ${msg.messageBody} (file attached)`;
      }
    }

    nativeContent += line + "\n";
  }

  return nativeContent;
}

// Convert ISO date to native WhatsApp format, preserving original format
function convertToNativeDate(isoDate, originalFormat = "US") {
  const date = new Date(isoDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  switch (originalFormat) {
    case "EU":
      // Format: [DD.MM.YYYY, HH:MM:SS]
      return `[${day.toString().padStart(2, "0")}.${month
        .toString()
        .padStart(2, "0")}.${year}, ${hours
        .toString()
        .padStart(2, "0")}:${minutes}:${seconds}]`;

    case "EU_NO_BRACKETS":
      // Format: DD.MM.YYYY, HH:MM:SS
      return `${day.toString().padStart(2, "0")}.${month
        .toString()
        .padStart(2, "0")}.${year}, ${hours
        .toString()
        .padStart(2, "0")}:${minutes}:${seconds}`;

    default:
      // US format: M/D/YY, H:MM
      const shortYear = year.toString().slice(-2);
      return `${month}/${day}/${shortYear}, ${hours}:${minutes}`;
  }
}

// Synchronize media files between formats
function syncMediaFiles(chatDir, messages) {
  const mediaTypes = ["image", "document", "video", "audio"];

  console.log("Syncing media files...");

  // Ensure all media directories exist
  mediaTypes.forEach((type) => {
    const dir = path.join(chatDir, type);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${type}/`);
    }
  });

  // Copy missing files between directories
  const attachmentMessages = messages.filter(
    (msg) => msg.isAttachment && msg.messageBody
  );

  for (const msg of attachmentMessages) {
    const filename = msg.messageBody;
    const sourceDir = getDirectoryForMessageType(msg.messageType);
    const sourceFile = path.join(chatDir, sourceDir, filename);

    // Check if file exists in correct location
    if (!fs.existsSync(sourceFile)) {
      // Try to find file in other directories
      let found = false;
      for (const type of mediaTypes) {
        const altFile = path.join(chatDir, type, filename);
        if (fs.existsSync(altFile)) {
          try {
            fs.copyFileSync(altFile, sourceFile);
            console.log(`Moved ${filename} from ${type}/ to ${sourceDir}/`);
            found = true;
            break;
          } catch (error) {
            console.warn(`Failed to copy ${filename}:`, error.message);
          }
        }
      }

      if (!found) {
        console.warn(`Media file not found: ${filename}`);
      }
    }
  }
}

// Get directory for message type (from existing converter)
function getDirectoryForMessageType(messageType) {
  switch (messageType) {
    case "image":
      return "image";
    case "document":
    case "pdf":
      return "document";
    case "video":
      return "video";
    case "audio":
      return "audio";
    case "sticker":
      return "sticker";
    default:
      return "document";
  }
}

// Main synchronization function
function syncFormats(chatDirectory) {
  console.log(`=== WhatsApp Format Synchronizer ===\n`);
  console.log(`Syncing directory: ${chatDirectory}\n`);

  const jsonPath = path.join(chatDirectory, "chats.json");
  const nativeDir = path.join(chatDirectory, "native_backups");
  // Find WhatsApp Chat file dynamically by pattern
  // Prioritize non-test phone numbers (avoid +12 345 67 89 0 and similar test patterns)
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

  // Check if files exist
  const hasJson = fs.existsSync(jsonPath);
  const hasNative = nativePath && fs.existsSync(nativePath);

  if (!hasJson && !hasNative) {
    console.error(
      "❌ No source files found! Need either chats.json or native backup."
    );
    process.exit(1);
  }

  console.log(`📄 JSON file: ${hasJson ? "✅ Found" : "❌ Missing"}`);
  if (hasNative) {
    console.log(`📄 Native file: ✅ Found - ${path.basename(nativePath)}`);
  } else {
    console.log(
      `📄 Native file: ❌ Missing (looking for WhatsApp Chat with +[number].txt)`
    );
  }
  console.log("");

  let jsonMessages = [];
  let nativeMessages = [];

  // Parse existing files
  if (hasJson) {
    console.log("📖 Parsing JSON file...");
    jsonMessages = parseJsonFile(jsonPath);
    console.log(`   Loaded ${jsonMessages.length} messages from JSON`);
  }

  if (hasNative) {
    console.log("📖 Parsing native file...");
    nativeMessages = parseNativeFile(nativePath);
    console.log(`   Loaded ${nativeMessages.length} messages from native`);
  }

  // Merge messages chronologically
  console.log("\n🔄 Merging messages...");
  const mergedMessages = mergeMessages(jsonMessages, nativeMessages);

  // Create backups
  if (hasJson) {
    const backupPath = `${jsonPath}.backup.${Date.now()}`;
    fs.copyFileSync(jsonPath, backupPath);
    console.log(`💾 Created backup: ${path.basename(backupPath)}`);
  }

  if (hasNative) {
    const backupPath = `${nativePath}.backup.${Date.now()}`;
    fs.copyFileSync(nativePath, backupPath);
    console.log(`💾 Created backup: ${path.basename(backupPath)}`);
  }

  // Sync media files
  console.log("\n📁 Syncing media files...");
  syncMediaFiles(chatDirectory, mergedMessages);

  // Write synchronized files
  console.log("\n💾 Writing synchronized files...");

  // Write JSON
  const jsonOutput = messagesToJson(mergedMessages);
  fs.writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2), "utf8");
  console.log(`✅ Updated ${jsonPath} (${jsonOutput.length} messages)`);

  // Write Native
  if (!fs.existsSync(nativeDir)) {
    fs.mkdirSync(nativeDir, { recursive: true });
  }
  const nativeOutput = messagesToNative(mergedMessages);

  // If no native file was found, create one with a generic name
  if (!nativePath) {
    nativePath = path.join(nativeDir, "WhatsApp Chat.txt");
  }

  fs.writeFileSync(nativePath, nativeOutput, "utf8");
  console.log(`✅ Updated ${nativePath} (${mergedMessages.length} messages)`);

  console.log("\n🎉 Synchronization complete!");
  console.log(
    `📊 Final result: ${mergedMessages.length} messages in chronological order`
  );
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.log("Usage: node src/sync_formats.js <chat_directory>");
    console.log("");
    console.log("Example:");
    console.log(
      "  node src/sync_formats.js data/input/2025/1234567890___Test-Chat"
    );
    process.exit(1);
  }

  const chatDirectory = args[0];

  if (!fs.existsSync(chatDirectory)) {
    console.error(`❌ Directory not found: ${chatDirectory}`);
    process.exit(1);
  }

  try {
    syncFormats(chatDirectory);
  } catch (error) {
    console.error("❌ Synchronization failed:", error.message);
    process.exit(1);
  }
}

module.exports = {
  syncFormats,
  parseJsonFile,
  parseNativeFile,
  mergeMessages,
  normalizeDate,
};
