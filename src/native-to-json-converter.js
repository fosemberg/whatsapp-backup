#!/usr/bin/env node

/**
 * Converter from native WhatsApp text format to WhatsApp JSON format
 * Usage: node native-to-json-converter.js <input.txt> <output.json> [attachments_dir]
 */

const fs = require("fs");
const path = require("path");

// Regular expressions for parsing native format
const MESSAGE_REGEX =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}) - (.+?): (.*)$/;
const MESSAGE_REGEX_ALT =
  /^\[(\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2})\] (.+?): (.*)$/;
const SYSTEM_MESSAGE_REGEX =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}, \d{1,2}:\d{2}) - (.*)$/;
const ATTACHMENT_REGEX = /^(.+?)\s+\(file attached\)$/;

// Function to parse native date format to ISO
function parseNativeDate(dateStr) {
  let date;

  // Try first format: "3/4/25, 0:50"
  const match1 = dateStr.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4}), (\d{1,2}):(\d{2})$/
  );
  if (match1) {
    let [, month, day, year, hour, minute] = match1;

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

  // Try second format: "20.06.2025, 12:29:30"
  const match2 = dateStr.match(
    /^(\d{2})\.(\d{2})\.(\d{4}), (\d{2}):(\d{2}):(\d{2})$/
  );
  if (match2) {
    const [, day, month, year, hour, minute, second] = match2;
    date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }

  if (!date || isNaN(date.getTime())) {
    console.warn(`Could not parse date: ${dateStr}`);
    return new Date().toISOString().slice(0, 19).replace("T", " ");
  }

  return date.toISOString().slice(0, 19).replace("T", " ");
}

// Function to get directory for file type
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
      return "document"; // Default fallback
  }
}

// Function to detect message type and extract filename
function analyzeMessageContent(content) {
  const attachmentMatch = content.match(ATTACHMENT_REGEX);

  if (attachmentMatch) {
    const filename = attachmentMatch[1];
    const ext = path.extname(filename).toLowerCase();

    let messageType;
    switch (ext) {
      case ".jpg":
      case ".jpeg":
      case ".png":
      case ".gif":
      case ".webp":
        messageType = "image";
        break;
      case ".mp4":
      case ".avi":
      case ".mov":
      case ".mkv":
      case ".mpeg":
        messageType = "video";
        break;
      case ".mp3":
      case ".wav":
      case ".ogg":
      case ".m4a":
        messageType = "audio";
        break;
      case ".pdf":
        messageType = "pdf";
        break;
      case ".doc":
      case ".docx":
      case ".txt":
      case ".xlsx":
      case ".ppt":
      case ".pptx":
      case ".zip":
      case ".js":
      case ".mjs":
      case ".ts":
      case ".tsx":
      case ".bin":
      case ".tex":
      case ".conf":
        messageType = "document";
        break;
      default:
        messageType = "document";
    }

    return {
      messageType,
      messageBody: filename,
      isAttachment: true,
    };
  }

  // Check for special image references
  if (content === "<image>") {
    return {
      messageType: "chat",
      messageBody: "【IMAGE】",
      isAttachment: false,
    };
  }

  return {
    messageType: "chat",
    messageBody: content,
    isAttachment: false,
  };
}

// Function to extract sender info
function extractSenderInfo(senderStr) {
  // Common patterns for sender identification
  const phoneRegex = /^\+\d+/;

  if (senderStr === "You") {
    return {
      country: "Test Country", // Default, should be configurable
      phoneNum: "+9876543210", // Default, should be configurable
      formattedName: "You",
      displayName: null,
    };
  }

  if (phoneRegex.test(senderStr)) {
    // Extract country code (rough estimation)
    const phoneMatch = senderStr.match(/^\+(\d{1,3})/);
    const countryCode = phoneMatch ? phoneMatch[1] : "1";

    let country = "Unknown";
    if (countryCode.startsWith("34")) country = "Test Country A";
    else if (countryCode.startsWith("7")) country = "Test Country B";
    else if (countryCode.startsWith("1")) country = "Test Country C";
    else if (countryCode.startsWith("86")) country = "Test Country D";
    else if (countryCode.startsWith("123")) country = "Test Country";
    else if (countryCode.startsWith("987")) country = "Test Country";

    return {
      country,
      phoneNum: senderStr,
      formattedName: senderStr,
      displayName: null,
    };
  }

  // Regular name
  return {
    country: "Unknown",
    phoneNum: null,
    formattedName: senderStr,
    displayName: senderStr,
  };
}

// Function to generate message ID
function generateMessageId(sender, timestamp, isOutgoing = false) {
  const hash = Buffer.from(`${sender}_${timestamp}_${Math.random()}`)
    .toString("hex")
    .substring(0, 16);
  const prefix = isOutgoing ? "true" : "false";
  return `${prefix}_1234567890@c.us_${hash.toUpperCase()}`;
}

// Main conversion function
function convertNativeToJson(
  nativeFilePath,
  outputJsonPath,
  attachmentsDir = null
) {
  try {
    console.log(`Reading native file: ${nativeFilePath}`);
    const nativeContent = fs.readFileSync(nativeFilePath, "utf8");
    const lines = nativeContent.split("\n");

    console.log(`Processing ${lines.length} lines...`);

    const messages = [];
    let currentMessage = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      // Try to match message line
      let messageMatch =
        line.match(MESSAGE_REGEX) || line.match(MESSAGE_REGEX_ALT);

      if (messageMatch) {
        // Save previous message if exists
        if (currentMessage) {
          messages.push(currentMessage);
        }

        const [, dateStr, sender, content] = messageMatch;
        const senderInfo = extractSenderInfo(sender);
        const contentInfo = analyzeMessageContent(content);

        currentMessage = {
          country: senderInfo.country,
          phoneNum: senderInfo.phoneNum,
          formattedName: senderInfo.formattedName,
          messageTime: parseNativeDate(dateStr),
          messageType: contentInfo.messageType,
          messageBody: contentInfo.messageBody,
          messageId: generateMessageId(
            sender,
            dateStr,
            sender === "You" || senderInfo.formattedName === "You"
          ),
        };

        if (senderInfo.displayName) {
          currentMessage.displayName = senderInfo.displayName;
        }

        // Handle attachments
        if (
          contentInfo.isAttachment &&
          attachmentsDir &&
          contentInfo.messageBody
        ) {
          const sourceFile = path.join(attachmentsDir, contentInfo.messageBody);
          const targetDirName = getDirectoryForMessageType(
            contentInfo.messageType
          );
          const targetDir = path.join(
            path.dirname(outputJsonPath),
            targetDirName
          );
          const targetFile = path.join(targetDir, contentInfo.messageBody);

          try {
            if (fs.existsSync(sourceFile)) {
              // Create target directory if it doesn't exist
              if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
              }

              // Copy the file
              fs.copyFileSync(sourceFile, targetFile);
              console.log(
                `Copied attachment: ${contentInfo.messageBody} to ${targetDirName}/`
              );
            } else {
              console.warn(`Attachment not found: ${sourceFile}`);
            }
          } catch (error) {
            console.warn(
              `Failed to copy attachment ${contentInfo.messageBody}:`,
              error.message
            );
          }
        }
      } else {
        // Check for system messages
        const systemMatch = line.match(SYSTEM_MESSAGE_REGEX);
        if (systemMatch) {
          // Skip system messages like encryption notice
          continue;
        }

        // This might be a continuation of the previous message (multi-line)
        if (currentMessage && !line.includes(" - ")) {
          // If current message is an attachment, create a new chat message instead
          if (currentMessage.messageType !== "chat") {
            // Save the current attachment message
            messages.push(currentMessage);

            // Create new chat message for the text
            const senderInfo = {
              country: currentMessage.country,
              phoneNum: currentMessage.phoneNum,
              formattedName: currentMessage.formattedName,
              displayName: currentMessage.displayName || null,
            };

            currentMessage = {
              country: senderInfo.country,
              phoneNum: senderInfo.phoneNum,
              formattedName: senderInfo.formattedName,
              messageTime: currentMessage.messageTime, // Same timestamp as attachment
              messageType: "chat",
              messageBody: line,
              messageId: generateMessageId(
                senderInfo.formattedName,
                currentMessage.messageTime,
                senderInfo.formattedName === "You"
              ),
            };

            if (senderInfo.displayName) {
              currentMessage.displayName = senderInfo.displayName;
            }
          } else {
            // Regular multi-line chat message
            currentMessage.messageBody += "\n" + line;
          }
        }
      }
    }

    // Add the last message
    if (currentMessage) {
      messages.push(currentMessage);
    }

    // Write JSON file
    console.log(`Writing JSON to: ${outputJsonPath}`);
    fs.writeFileSync(outputJsonPath, JSON.stringify(messages, null, 2), "utf8");

    console.log("Conversion completed successfully!");
    console.log(`Converted ${messages.length} messages`);
  } catch (error) {
    console.error("Error during conversion:", error.message);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(
      "Usage: node native-to-json-converter.js <input.txt> <output.json> [attachments_dir]"
    );
    console.log("");
    console.log("  input.txt       - Path to input native WhatsApp text file");
    console.log("  output.json     - Path to output JSON file");
    console.log(
      "  attachments_dir - Optional: Directory to copy attachments from"
    );
    process.exit(1);
  }

  const [inputTxt, outputJson, attachmentsDir] = args;
  convertNativeToJson(inputTxt, outputJson, attachmentsDir);
}

module.exports = {
  convertNativeToJson,
  parseNativeDate,
  analyzeMessageContent,
  extractSenderInfo,
  generateMessageId,
  getDirectoryForMessageType,
};
