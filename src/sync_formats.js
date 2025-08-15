#!/usr/bin/env node

/**
 * WhatsApp Format Synchronizer
 * Synchronizes JSON and native WhatsApp formats bidirectionally
 * Maintains chronological order and handles different date formats
 * Usage: node src/sync_formats.js <chat_directory>
 */

const fs = require("fs");
const path = require("path");

// Load configuration for universal sender identification
let configCache = null;
function loadConfig(customConfigPath = null) {
  if (!configCache) {
    try {
      // Use custom config path if provided (for tests), otherwise use main config
      const configPath =
        customConfigPath || path.join(__dirname, "public", "config.json");
      const configData = fs.readFileSync(configPath, "utf8");
      configCache = JSON.parse(configData);
      console.log(
        `📖 Loaded config: ${
          configCache.myIdentifiers?.length || 0
        } my identifiers`
      );
    } catch (error) {
      console.warn(
        "⚠️ Could not load config.json, using default identification"
      );
      configCache = { myIdentifiers: ["You"] };
    }
  }
  return configCache;
}

// Reset config cache (for tests)
function resetConfigCache() {
  configCache = null;
}

// Check if message is from the user (based on config)
function isMyMessage(msg) {
  const config = loadConfig();
  const myIdentifiers = config.myIdentifiers || ["You"];

  // Check formattedName and displayName against all my identifiers
  const formattedName = (msg.formattedName || "").trim();
  const displayName = (msg.displayName || "").trim();

  return myIdentifiers.some(
    (identifier) => identifier === formattedName || identifier === displayName
  );
}

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
  let year,
    month,
    day,
    hour,
    minute,
    second = 0;

  // Try US format: "3/4/25, 0:50"
  const usMatch = dateStr.match(DATE_FORMATS.US);
  if (usMatch) {
    let [, monthStr, dayStr, yearStr, hourStr, minuteStr] = usMatch;

    // Handle 2-digit years
    if (yearStr.length === 2) {
      yearStr = parseInt(yearStr) > 50 ? `19${yearStr}` : `20${yearStr}`;
    }

    year = parseInt(yearStr);
    month = parseInt(monthStr);
    day = parseInt(dayStr);
    hour = parseInt(hourStr);
    minute = parseInt(minuteStr);
  }

  // Try EU format: "[20.06.2025, 12:29:30]"
  const euMatch = dateStr.match(DATE_FORMATS.EU);
  if (euMatch) {
    const [, dayStr, monthStr, yearStr, hourStr, minuteStr, secondStr] =
      euMatch;
    year = parseInt(yearStr);
    month = parseInt(monthStr);
    day = parseInt(dayStr);
    hour = parseInt(hourStr);
    minute = parseInt(minuteStr);
    second = parseInt(secondStr);
  }

  // Try EU format without brackets: "04.07.2025, 20:27:42"
  const euNoBracketsMatch = dateStr.match(DATE_FORMATS.EU_NO_BRACKETS);
  if (euNoBracketsMatch) {
    const [, dayStr, monthStr, yearStr, hourStr, minuteStr, secondStr] =
      euNoBracketsMatch;
    year = parseInt(yearStr);
    month = parseInt(monthStr);
    day = parseInt(dayStr);
    hour = parseInt(hourStr);
    minute = parseInt(minuteStr);
    second = parseInt(secondStr);
  }

  // Try ISO format: "2025-02-28 18:50:57"
  const isoMatch = dateStr.match(
    /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2}):(\d{2})$/
  );
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] =
      isoMatch;
    year = parseInt(yearStr);
    month = parseInt(monthStr);
    day = parseInt(dayStr);
    hour = parseInt(hourStr);
    minute = parseInt(minuteStr);
    second = parseInt(secondStr);
  }

  if (!year || !month || !day || hour === undefined || minute === undefined) {
    console.warn(`Could not parse date: ${dateStr}`);
    // Fallback - try to parse as-is and format it
    const date = new Date(dateStr.replace(" ", "T"));
    if (!isNaN(date.getTime())) {
      return date.toISOString().slice(0, 19).replace("T", " ");
    }
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }

  // Create ISO-like string without timezone conversion
  return `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")} ${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}:${second.toString().padStart(2, "0")}`;
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

  // Handle "You" mapping - smart pairing between formats
  if (youStats) {
    mapping.set(youStats[0], "SELF");

    // Strategy 1: Content matching - find who sends same messages as "You"
    const youMessages = youStats[1].sampleMessages;
    let bestMatch = null;
    let bestScore = 0;

    for (const [sender, stats] of nameStats) {
      if (stats.isPhone || stats.isYou) continue;

      // Check if any of their messages match "You" messages
      const matchScore = stats.sampleMessages.filter((msg) =>
        youMessages.some(
          (youMsg) =>
            youMsg.length > 5 &&
            msg.length > 5 &&
            (youMsg.includes(msg.substring(0, 20)) ||
              msg.includes(youMsg.substring(0, 20)))
        )
      ).length;

      if (matchScore > bestScore) {
        bestMatch = [sender, stats];
        bestScore = matchScore;
      }
    }

    // Strategy 2: If no content match, use activity pattern
    if (!bestMatch || bestScore === 0) {
      const totalMessages = allMessages.length;
      const youMessageCount = youStats[1].count;

      // Find most active non-phone sender if "You" is also active
      if (youMessageCount / totalMessages > 0.15) {
        const candidate = nameStats
          .filter(([sender, stats]) => !stats.isPhone && !stats.isYou)
          .sort(([, a], [, b]) => b.count - a.count)[0];

        if (candidate && candidate[1].count >= 1) {
          bestMatch = candidate;
          bestScore = -1; // Indicate activity-based match
        }
      }
    }

    if (bestMatch) {
      const matchType = bestScore > 0 ? "content" : "activity";
      console.log(
        `🔗 Mapping "${bestMatch[0]}" to SELF via ${matchType} analysis (${bestMatch[1].count} messages)`
      );
      mapping.set(bestMatch[0], "SELF");
    }
  }

  // Handle phone number normalization and link with names
  const phoneToNameMapping = new Map();

  phoneStats.forEach(([sender, stats]) => {
    // Normalize phone format: remove spaces, keep only digits and +
    const normalizedPhone = sender.replace(/[\s\-\(\)]/g, "");
    mapping.set(sender, normalizedPhone);

    // Try to find corresponding name for this phone number
    // Look at messages from this phone to see if there are displayNames
    const associatedNames = new Set();
    allMessages.forEach((msg) => {
      if (
        (msg.formattedName === sender || msg.phoneNum === normalizedPhone) &&
        msg.displayName
      ) {
        associatedNames.add(msg.displayName.trim());
      }
    });

    if (associatedNames.size > 0) {
      const primaryName = Array.from(associatedNames)[0];
      phoneToNameMapping.set(normalizedPhone, primaryName);
      console.log(`🔗 Linked phone ${normalizedPhone} → name "${primaryName}"`);
    }
  });

  // Handle display names and link back to phone numbers
  nameStats.forEach(([sender, stats]) => {
    if (mapping.has(sender)) return; // Already mapped

    // Check if this name is associated with any phone number
    let linkedToPhone = false;
    for (const [phone, name] of phoneToNameMapping) {
      if (name === sender || sender.includes(name) || name.includes(sender)) {
        mapping.set(sender, phone); // Map name to normalized phone
        console.log(`🔗 Linked name "${sender}" → phone ${phone}`);
        linkedToPhone = true;
        break;
      }
    }

    if (!linkedToPhone) {
      // No phone link found, use display name or extract short name
      if (stats.displayNames.size > 0) {
        const mostCommonDisplayName = Array.from(stats.displayNames)[0];
        mapping.set(sender, mostCommonDisplayName);
      } else {
        const shortName = extractShortName(sender);
        mapping.set(sender, shortName);
      }
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

  // Basic phone normalization - most important for deduplication
  if (/^\+?\d+[\s\d\-\(\)]*$/.test(sender)) {
    return sender.replace(/[\s\-\(\)]/g, "");
  }

  // For non-phone senders, use a consistent approach:
  // 1. Try display name first (most stable)
  // 2. Then try to extract a consistent short form
  let normalizedName = sender;

  if (msg.displayName && msg.displayName.trim() !== "") {
    normalizedName = msg.displayName.trim();
  }

  // Remove common prefixes/suffixes that might vary
  normalizedName = normalizedName.replace(/^[~@]/, ""); // Remove ~ and @ prefixes

  // For very long names, extract first meaningful part
  if (normalizedName.length > 20) {
    const parts = normalizedName.split(/[\s\-_]+/);
    normalizedName = parts[0] || normalizedName.substring(0, 15);
  }

  return normalizedName;
}

// Create a stable hash for message content to ensure proper deduplication
function createMessageHash(msg, senderMapping = null) {
  // Normalize message content for consistent hashing
  const normalizedBody = (msg.messageBody || "").trim().toLowerCase();

  // Robust deterministic sender normalization
  let normalizedSender = (msg.formattedName || "").trim();

  // Basic deterministic normalizations using config
  if (isMyMessage(msg)) {
    normalizedSender = "SELF";
    // For my messages, normalize all my identifiers to SELF
  } else if (/^\+?\d+[\s\d\-\(\)]*$/.test(normalizedSender)) {
    // Normalize phone numbers
    normalizedSender = normalizedSender.replace(/[\s\-\(\)]/g, "");
  } else {
    // For names, use first word/part for consistency across variations
    // This handles cases like "Alice Johnson" vs "Alice"
    const nameParts = normalizedSender.split(/\s+/);
    if (nameParts.length > 0 && nameParts[0].length > 2) {
      normalizedSender = nameParts[0];
    }
  }

  const normalizedType = msg.messageType || "chat";

  // For better deduplication, also include message time rounded to nearest minute
  const messageDate = new Date(msg.messageTime);

  // Check if date is valid
  if (isNaN(messageDate.getTime())) {
    console.warn(`Invalid date in message: ${msg.messageTime}`);
    // Use timestamp as fallback
    const fallbackDate = new Date(msg.timestamp || 0);
    const roundedTime = Math.floor((msg.timestamp || 0) / 60000) * 60000; // Round to minute
    var roundedTimeValue = roundedTime;
  } else {
    const roundedTime = new Date(
      messageDate.getFullYear(),
      messageDate.getMonth(),
      messageDate.getDate(),
      messageDate.getHours(),
      messageDate.getMinutes()
    );
    var roundedTimeValue = roundedTime.getTime();
  }

  // Create content-based hash including rounded time for better precision
  const content = `${normalizedSender}:${normalizedType}:${normalizedBody}:${roundedTimeValue}`;

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
  const normalizedBody = (msg.messageBody || "").trim().toLowerCase();

  // Robust deterministic sender normalization (same as createMessageHash)
  let normalizedSender = (msg.formattedName || "").trim();

  // Basic deterministic normalizations using config
  if (isMyMessage(msg)) {
    normalizedSender = "SELF";
    // For my messages, normalize all my identifiers to SELF
  } else if (/^\+?\d+[\s\d\-\(\)]*$/.test(normalizedSender)) {
    // Normalize phone numbers
    normalizedSender = normalizedSender.replace(/[\s\-\(\)]/g, "");
  } else {
    // For names, use first word/part for consistency across variations
    // This handles cases like "Alice Johnson" vs "Alice"
    const nameParts = normalizedSender.split(/\s+/);
    if (nameParts.length > 0 && nameParts[0].length > 2) {
      normalizedSender = nameParts[0];
    }
  }

  const normalizedType = msg.messageType || "chat";

  // Round timestamp to nearest 5 minutes for time tolerance
  // Check if timestamp is valid
  const timestamp = msg.timestamp || 0;
  const roundedTimestamp = Math.floor(timestamp / 300000) * 300000;

  return `${normalizedSender}:${normalizedType}:${normalizedBody}:${roundedTimestamp}`;
}

// Deduplicate messages within a single source
function deduplicateMessages(messages, sourceName, senderMapping = null) {
  console.log(`🧹 Deduplicating ${messages.length} ${sourceName} messages...`);

  const seenHashes = new Set();
  const uniqueMessages = [];
  let duplicatesRemoved = 0;

  for (const msg of messages) {
    const contentHash = createMessageHash(msg, senderMapping);

    if (seenHashes.has(contentHash)) {
      duplicatesRemoved++;
      continue;
    }

    seenHashes.add(contentHash);
    uniqueMessages.push(msg);
  }

  console.log(
    `   Removed ${duplicatesRemoved} duplicates, ${uniqueMessages.length} unique messages remain`
  );
  return uniqueMessages;
}

// Merge messages from both sources, removing duplicates and maintaining chronological order
function mergeMessages(jsonMessages, nativeMessages) {
  console.log(
    `Merging ${jsonMessages.length} JSON messages with ${nativeMessages.length} native messages...`
  );

  // Use deterministic deduplication without dynamic sender mapping
  console.log("🔍 Using deterministic deduplication without smart mapping...");
  const senderMapping = null; // Disable smart mapping for full determinism

  // First, deduplicate within each source
  const uniqueJsonMessages = deduplicateMessages(
    jsonMessages,
    "JSON",
    senderMapping
  );
  const uniqueNativeMessages = deduplicateMessages(
    nativeMessages,
    "Native",
    senderMapping
  );

  console.log(
    `📋 Using deterministic message comparison without sender mapping`
  );

  const seenContentHashes = new Set();
  const seenTimeAwareHashes = new Set();
  const mergedMessages = [];

  // Combine all unique messages and sort by timestamp
  const allMessages = [...uniqueJsonMessages, ...uniqueNativeMessages].sort(
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

  const totalInputMessages = jsonMessages.length + nativeMessages.length;
  const totalDuplicatesRemoved =
    jsonMessages.length -
    uniqueJsonMessages.length +
    (nativeMessages.length - uniqueNativeMessages.length) +
    duplicatesRemoved;

  console.log(
    `Merged result: ${mergedMessages.length} unique messages (removed ${totalDuplicatesRemoved} duplicates total)`
  );
  return mergedMessages;
}

// Convert merged messages back to JSON format
function messagesToJson(messages) {
  // First pass: build phone mapping for messages without phoneNum
  const phoneMapping = buildPhoneMappingFromMessages(messages);

  return messages.map((msg) => ({
    country: msg.country,
    phoneNum:
      msg.phoneNum ||
      phoneMapping.get(msg.formattedName) ||
      extractPhoneFromMessage(msg),
    formattedName: msg.formattedName,
    ...(msg.displayName && { displayName: msg.displayName }),
    messageTime: msg.messageTime,
    messageType: msg.messageType,
    messageBody: msg.messageBody,
    messageId: msg.messageId,
  }));
}

// Build phone mapping by analyzing messages with phoneNum
function buildPhoneMappingFromMessages(messages) {
  const mapping = new Map();

  // Find patterns: formattedName -> phoneNum
  messages.forEach((msg) => {
    if (msg.phoneNum && msg.formattedName) {
      mapping.set(msg.formattedName, msg.phoneNum);
    }
  });

  return mapping;
}

// Extract phone number from message for web display
function extractPhoneFromMessage(msg) {
  // Try to extract from formattedName if it looks like a phone
  if (msg.formattedName && /^\+?\d+[\s\d\-\(\)]*$/.test(msg.formattedName)) {
    return msg.formattedName.replace(/[\s\-\(\)]/g, "");
  }

  // For "You" messages, try to find the most common phoneNum among "You" messages
  if (msg.formattedName === "You") {
    // This will be set dynamically during processing
    return msg.inferredPhone || null;
  }

  return null;
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
  // Parse our custom ISO-like format: "2025-08-11 13:11:00"
  const match = isoDate.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/
  );
  if (!match) {
    console.warn(`Could not parse ISO date: ${isoDate}`);
    const date = new Date(isoDate);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    switch (originalFormat) {
      case "EU":
        return `[${day.toString().padStart(2, "0")}.${month
          .toString()
          .padStart(2, "0")}.${year}, ${hours
          .toString()
          .padStart(2, "0")}:${minutes}:${seconds}]`;
      case "EU_NO_BRACKETS":
        return `${day.toString().padStart(2, "0")}.${month
          .toString()
          .padStart(2, "0")}.${year}, ${hours
          .toString()
          .padStart(2, "0")}:${minutes}:${seconds}`;
      default:
        const shortYear = year.toString().slice(-2);
        return `${month}/${day}/${shortYear}, ${hours
          .toString()
          .padStart(2, "0")}:${minutes}`;
    }
  }

  const [, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr] = match;
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  const day = parseInt(dayStr);
  const hours = parseInt(hourStr);
  const minutes = minuteStr;
  const seconds = secondStr;

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
      // US format: M/D/YY, H:MM (with proper 24-hour format)
      const shortYear = year.toString().slice(-2);
      return `${month}/${day}/${shortYear}, ${hours
        .toString()
        .padStart(2, "0")}:${minutes}`;
  }
}

// Synchronize media files between formats
function syncMediaFiles(chatDir, messages) {
  const mediaTypes = ["image", "document", "video", "audio"];
  const additionalSearchDirs = ["native_backups", "sticker"]; // Additional places to look for files

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

  let foundCount = 0;
  let movedCount = 0;
  let missingCount = 0;

  for (const msg of attachmentMessages) {
    const filename = msg.messageBody;
    if (!filename || filename === "undefined") continue;

    const targetDir = getDirectoryForMessageType(msg.messageType);
    const targetFile = path.join(chatDir, targetDir, filename);

    // Check if file already exists in correct location
    if (fs.existsSync(targetFile)) {
      foundCount++;
      continue;
    }

    // Try to find file in other standard media directories
    let found = false;
    for (const type of mediaTypes) {
      if (type === targetDir) continue; // Skip target directory
      const altFile = path.join(chatDir, type, filename);
      if (fs.existsSync(altFile)) {
        try {
          fs.copyFileSync(altFile, targetFile);
          console.log(`Moved ${filename} from ${type}/ to ${targetDir}/`);
          found = true;
          movedCount++;
          break;
        } catch (error) {
          console.warn(`Failed to copy ${filename}:`, error.message);
        }
      }
    }

    // If still not found, search in additional directories (like native_backups)
    if (!found) {
      for (const searchDir of additionalSearchDirs) {
        const searchPath = path.join(chatDir, searchDir);
        if (!fs.existsSync(searchPath)) continue;

        const altFile = path.join(searchPath, filename);
        if (fs.existsSync(altFile)) {
          try {
            fs.copyFileSync(altFile, targetFile);
            console.log(
              `Moved ${filename} from ${searchDir}/ to ${targetDir}/`
            );
            found = true;
            movedCount++;
            break;
          } catch (error) {
            console.warn(`Failed to copy ${filename}:`, error.message);
          }
        }
      }
    }

    if (!found) {
      console.warn(`Media file not found: ${filename}`);
      missingCount++;
    }
  }

  console.log(
    `📊 Media sync summary: ${foundCount} already in place, ${movedCount} moved, ${missingCount} missing`
  );
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
  resetConfigCache,
};
