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
        // Display name format like "~Yanzhu"
        displayName = sender.substring(1);
        formattedName = displayName;
        country = "Unknown";
      } else {
        // Regular name
        displayName = sender;
        formattedName = sender;
        country = "Unknown";
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
  }));
}

// Generate message ID
function generateMessageId(sender, timestamp, isMultiLine = false) {
  const hash = Buffer.from(
    `${sender}_${timestamp}_${Math.random()}_${isMultiLine}`
  )
    .toString("hex")
    .substring(0, 16);
  const prefix =
    sender === "You" || sender.includes("Mikhail") ? "true" : "false";
  return `${prefix}_sync@c.us_${hash.toUpperCase()}`;
}

// Merge messages from both sources, removing duplicates and maintaining chronological order
function mergeMessages(jsonMessages, nativeMessages) {
  console.log(
    `Merging ${jsonMessages.length} JSON messages with ${nativeMessages.length} native messages...`
  );

  // Create a map for deduplication based on content and timestamp proximity
  const messageMap = new Map();
  const TIMESTAMP_TOLERANCE = 60000; // 1 minute tolerance for matching

  // Add all messages to the map
  const allMessages = [...jsonMessages, ...nativeMessages];

  for (const msg of allMessages) {
    // Create a key for deduplication
    const contentKey = `${msg.messageBody}_${msg.messageType}_${msg.formattedName}`;

    // Check if we already have a similar message within time tolerance
    let isDuplicate = false;
    for (const [existingKey, existingMsg] of messageMap) {
      if (
        existingKey.startsWith(contentKey.substring(0, 50)) &&
        Math.abs(existingMsg.timestamp - msg.timestamp) < TIMESTAMP_TOLERANCE
      ) {
        // Keep the JSON version if available (it has more metadata)
        if (msg.source === "json" && existingMsg.source === "native") {
          messageMap.set(existingKey, msg);
        }
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      const uniqueKey = `${contentKey}_${msg.timestamp}`;
      messageMap.set(uniqueKey, msg);
    }
  }

  // Convert back to array and sort chronologically
  const mergedMessages = Array.from(messageMap.values()).sort(
    (a, b) => a.timestamp - b.timestamp
  );

  console.log(`Merged result: ${mergedMessages.length} unique messages`);
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
    const nativeDate = convertToNativeDate(msg.messageTime);
    const senderName = msg.displayName || msg.formattedName || msg.phoneNum;
    let line = "";

    if (msg.messageType === "chat") {
      line = `${nativeDate} - ${senderName}: ${msg.messageBody}`;
    } else {
      line = `${nativeDate} - ${senderName}: ${msg.messageBody} (file attached)`;
    }

    nativeContent += line + "\n";
  }

  return nativeContent;
}

// Convert ISO date to native WhatsApp format
function convertToNativeDate(isoDate) {
  const date = new Date(isoDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${month}/${day}/${year}, ${hours}:${minutes}`;
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
  const nativePath = path.join(
    nativeDir,
    "WhatsApp Chat with +12 345 67 89 0.txt"
  );

  // Check if files exist
  const hasJson = fs.existsSync(jsonPath);
  const hasNative = fs.existsSync(nativePath);

  if (!hasJson && !hasNative) {
    console.error(
      "❌ No source files found! Need either chats.json or native backup."
    );
    process.exit(1);
  }

  console.log(`📄 JSON file: ${hasJson ? "✅ Found" : "❌ Missing"}`);
  console.log(`📄 Native file: ${hasNative ? "✅ Found" : "❌ Missing"}\n`);

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
