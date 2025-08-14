#!/usr/bin/env node

/**
 * Converter from WhatsApp JSON format to native WhatsApp text format
 * Usage: node json-to-native-converter.js <input.json> <output.txt> [attachments_dir]
 */

const fs = require("fs");
const path = require("path");

// Function to parse ISO date and convert to WhatsApp native format
function convertToNativeDate(isoDate) {
  const date = new Date(isoDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear().toString().slice(-2);
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${month}/${day}/${year}, ${hours}:${minutes}`;
}

// Function to get sender name from JSON message
function getSenderName(message) {
  // Check if it's outgoing message (You)
  if (message.formattedName === "You") {
    return message.formattedName;
  }

  // Use displayName if available, otherwise use formattedName
  return message.displayName || message.formattedName || message.phoneNum;
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

// Function to convert a single JSON message to native format
function convertMessage(message) {
  const nativeDate = convertToNativeDate(message.messageTime);
  const senderName = getSenderName(message);
  let result = "";

  switch (message.messageType) {
    case "chat":
      if (message.messageBody === "【IMAGE】") {
        // Special case for image reference
        result = `${nativeDate} - ${senderName}: <image>`;
      } else {
        result = `${nativeDate} - ${senderName}: ${message.messageBody || ""}`;
      }
      break;

    case "image":
      result = `${nativeDate} - ${senderName}: ${
        message.messageBody || "image"
      } (file attached)`;
      break;

    case "document":
    case "pdf":
    case "video":
    case "audio":
    case "sticker":
      result = `${nativeDate} - ${senderName}: ${
        message.messageBody || "file"
      } (file attached)`;
      break;

    default:
      // Unknown message type, treat as chat
      result = `${nativeDate} - ${senderName}: ${message.messageBody || ""}`;
  }

  return result;
}

// Main conversion function
function convertJsonToNative(
  jsonFilePath,
  outputFilePath,
  attachmentsDir = null
) {
  try {
    console.log(`Reading JSON file: ${jsonFilePath}`);
    const jsonContent = fs.readFileSync(jsonFilePath, "utf8");
    const messages = JSON.parse(jsonContent);

    if (!Array.isArray(messages)) {
      throw new Error("JSON file should contain an array of messages");
    }

    console.log(`Processing ${messages.length} messages...`);

    let nativeContent = "";

    // Add initial system message
    if (messages.length > 0) {
      const firstDate = convertToNativeDate(messages[0].messageTime);
      nativeContent += `${firstDate} - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. Learn more.\n`;
      nativeContent += `${firstDate} - \n`;
    }

    // Convert each message
    for (const message of messages) {
      const nativeLine = convertMessage(message);
      nativeContent += nativeLine + "\n";

      // Handle media files if attachments directory is provided
      if (
        attachmentsDir &&
        message.messageType !== "chat" &&
        message.messageBody
      ) {
        const sourceDir = getDirectoryForMessageType(message.messageType);
        const sourceFile = path.join(
          path.dirname(jsonFilePath),
          sourceDir,
          message.messageBody
        );
        const targetFile = path.join(attachmentsDir, message.messageBody);

        try {
          if (fs.existsSync(sourceFile)) {
            // Create target directory if it doesn't exist
            const targetDir = path.dirname(targetFile);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }

            // Copy the file
            fs.copyFileSync(sourceFile, targetFile);
            console.log(`Copied attachment: ${message.messageBody}`);
          } else {
            console.warn(`Attachment not found: ${sourceFile}`);
          }
        } catch (error) {
          console.warn(
            `Failed to copy attachment ${message.messageBody}:`,
            error.message
          );
        }
      }
    }

    // Write native format file
    console.log(`Writing native format to: ${outputFilePath}`);
    fs.writeFileSync(outputFilePath, nativeContent, "utf8");

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
      "Usage: node json-to-native-converter.js <input.json> <output.txt> [attachments_dir]"
    );
    console.log("");
    console.log("  input.json      - Path to input JSON file");
    console.log("  output.txt      - Path to output native WhatsApp text file");
    console.log(
      "  attachments_dir - Optional: Directory to copy attachments to"
    );
    process.exit(1);
  }

  const [inputJson, outputTxt, attachmentsDir] = args;
  convertJsonToNative(inputJson, outputTxt, attachmentsDir);
}

module.exports = {
  convertJsonToNative,
  convertMessage,
  convertToNativeDate,
  getSenderName,
  getDirectoryForMessageType,
};
