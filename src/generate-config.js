#!/usr/bin/env node

/**
 * WhatsApp Config Generator
 * Analyzes chat data to help generate config.json with proper myIdentifiers
 * Usage: node src/generate-config.js <chat_directory>
 */

const fs = require("fs");
const path = require("path");
const { parseJsonFile, parseNativeFile } = require("./sync_formats");

// Regular expression for phone number detection
const PHONE_REGEX = /^\+?[\d\s\-\(\)]{7,}$/;

function analyzeChat(chatDirectory) {
  console.log(`🔍 Analyzing chat directory: ${chatDirectory}`);
  console.log("=".repeat(60));

  if (!fs.existsSync(chatDirectory)) {
    console.error(`❌ Directory not found: ${chatDirectory}`);
    process.exit(1);
  }

  const identifiers = new Set();
  const phones = new Set();
  const displayNames = new Set();
  const formattedNames = new Set();

  // Analyze JSON file
  const jsonPath = path.join(chatDirectory, "chats.json");
  if (fs.existsSync(jsonPath)) {
    console.log("📄 Found chats.json, analyzing...");
    try {
      const jsonMessages = parseJsonFile(jsonPath);
      console.log(`   📊 Loaded ${jsonMessages.length} messages from JSON`);

      jsonMessages.forEach((msg) => {
        // Collect formattedName
        if (msg.formattedName && msg.formattedName.trim()) {
          const name = msg.formattedName.trim();
          formattedNames.add(name);
          identifiers.add(name);

          // Check if it's a phone number
          if (PHONE_REGEX.test(name)) {
            phones.add(name);
          }
        }

        // Collect displayName
        if (msg.displayName && msg.displayName.trim()) {
          const displayName = msg.displayName.trim();
          displayNames.add(displayName);
          identifiers.add(displayName);

          // Check if it's a phone number
          if (PHONE_REGEX.test(displayName)) {
            phones.add(displayName);
          }
        }

        // Collect phoneNum
        if (msg.phoneNum && msg.phoneNum.trim()) {
          const phone = msg.phoneNum.trim();
          phones.add(phone);
          identifiers.add(phone);
        }
      });
    } catch (error) {
      console.error(`❌ Error parsing JSON: ${error.message}`);
    }
  } else {
    console.log("⚠️  chats.json not found");
  }

  // Analyze Native file
  const nativeBackupsDir = path.join(chatDirectory, "native_backups");
  if (fs.existsSync(nativeBackupsDir)) {
    console.log("📄 Found native_backups directory, analyzing...");

    // Find WhatsApp Chat file
    const files = fs.readdirSync(nativeBackupsDir);
    const nativeFile = files.find(
      (file) => file.startsWith("WhatsApp Chat with") && file.endsWith(".txt")
    );

    if (nativeFile) {
      const nativePath = path.join(nativeBackupsDir, nativeFile);
      console.log(`   📱 Found native file: ${nativeFile}`);

      try {
        const nativeMessages = parseNativeFile(nativePath);
        console.log(
          `   📊 Loaded ${nativeMessages.length} messages from native`
        );

        nativeMessages.forEach((msg) => {
          // Collect formattedName
          if (msg.formattedName && msg.formattedName.trim()) {
            const name = msg.formattedName.trim();
            formattedNames.add(name);
            identifiers.add(name);

            // Check if it's a phone number
            if (PHONE_REGEX.test(name)) {
              phones.add(name);
            }
          }

          // Collect displayName
          if (msg.displayName && msg.displayName.trim()) {
            const displayName = msg.displayName.trim();
            displayNames.add(displayName);
            identifiers.add(displayName);

            // Check if it's a phone number
            if (PHONE_REGEX.test(displayName)) {
              phones.add(displayName);
            }
          }
        });
      } catch (error) {
        console.error(`❌ Error parsing native file: ${error.message}`);
      }
    } else {
      console.log("⚠️  No WhatsApp Chat file found in native_backups");
    }
  } else {
    console.log("⚠️  native_backups directory not found");
  }

  // Display results
  console.log("\n" + "=".repeat(60));
  console.log("📊 ANALYSIS RESULTS");
  console.log("=".repeat(60));

  console.log(`\n🔤 ALL UNIQUE IDENTIFIERS (${identifiers.size} total):`);
  const sortedIdentifiers = Array.from(identifiers).sort();
  sortedIdentifiers.forEach((id, index) => {
    const type = PHONE_REGEX.test(id) ? "📞" : id === "You" ? "👤" : "👤";
    console.log(`  ${(index + 1).toString().padStart(2)}) ${type} "${id}"`);
  });

  console.log(`\n📞 PHONE NUMBERS (${phones.size} total):`);
  Array.from(phones)
    .sort()
    .forEach((phone, index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}) "${phone}"`);
    });

  console.log(`\n👤 FORMATTED NAMES (${formattedNames.size} total):`);
  Array.from(formattedNames)
    .sort()
    .forEach((name, index) => {
      const isPhone = PHONE_REGEX.test(name);
      const emoji = isPhone ? "📞" : name === "You" ? "👤" : "👤";
      console.log(
        `  ${(index + 1).toString().padStart(2)}) ${emoji} "${name}"`
      );
    });

  console.log(`\n🏷️  DISPLAY NAMES (${displayNames.size} total):`);
  Array.from(displayNames)
    .sort()
    .forEach((name, index) => {
      const isPhone = PHONE_REGEX.test(name);
      const emoji = isPhone ? "📞" : "🏷️";
      console.log(
        `  ${(index + 1).toString().padStart(2)}) ${emoji} "${name}"`
      );
    });

  // Generate example config
  console.log("\n" + "=".repeat(60));
  console.log("📝 EXAMPLE CONFIG TEMPLATE");
  console.log("=".repeat(60));
  console.log("Copy the identifiers that belong to YOU into this template:");
  console.log("");

  const exampleConfig = {
    myIdentifiers: [
      "You",
      "// Add your name(s) here",
      "// Add your phone number(s) here",
    ],
  };

  console.log(JSON.stringify(exampleConfig, null, 2));

  console.log("\n💡 INSTRUCTIONS:");
  console.log("1. Copy the template above");
  console.log("2. Remove lines that DON'T belong to you");
  console.log("3. Save to config.json (project root)");
  console.log("4. Test with: node src/sync_formats.js <your_chat_directory>");

  console.log("\n🎯 QUICK COPY-PASTE TEMPLATE:");
  console.log("{");
  console.log('  "myIdentifiers": [');

  // Add ALL identifiers
  const sortedForTemplate = Array.from(identifiers).sort((a, b) => {
    // Put "You" first, then phones, then names
    if (a === "You") return -1;
    if (b === "You") return 1;
    if (PHONE_REGEX.test(a) && !PHONE_REGEX.test(b)) return -1;
    if (PHONE_REGEX.test(b) && !PHONE_REGEX.test(a)) return 1;
    return a.localeCompare(b);
  });

  sortedForTemplate.forEach((id, index) => {
    const isLast = index === sortedForTemplate.length - 1;
    const comma = isLast ? "" : ",";

    console.log(`    "${id}"${comma}`);
  });

  console.log("  ]");
  console.log("}");

  return {
    identifiers: Array.from(identifiers),
    phones: Array.from(phones),
    displayNames: Array.from(displayNames),
    formattedNames: Array.from(formattedNames),
  };
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log("🔧 WhatsApp Config Generator");
    console.log(
      "Analyzes chat data to help generate config.json with proper myIdentifiers"
    );
    console.log("");
    console.log("Usage:");
    console.log("  node src/generate-config.js <chat_directory>");
    console.log("");
    console.log("Example:");
    console.log(
      "  node src/generate-config.js data/input/2025/12345678901___Test-Chat"
    );
    console.log("");
    console.log("Output:");
    console.log("  📊 Lists all unique identifiers found in the chat");
    console.log("  📝 Provides template for config.json");
    console.log("  💡 Gives instructions for manual selection");
    console.log("");
    console.log("Next steps:");
    console.log("  1. Run this script on your chat directory");
    console.log("  2. Identify which identifiers belong to you");
    console.log("  3. Create/update config.json (project root)");
    console.log("  4. Test with sync_formats.js");
    process.exit(args.length === 0 ? 1 : 0);
  }

  const chatDirectory = args[0];
  analyzeChat(chatDirectory);
}

module.exports = { analyzeChat };
