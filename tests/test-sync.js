#!/usr/bin/env node

/**
 * Test script for sync_formats.js
 * Creates test data and demonstrates synchronization
 */

const fs = require("fs");
const path = require("path");
const { syncFormats } = require("../src/sync_formats");

function createTestData() {
  console.log("=== Creating Test WhatsApp Data ===\n");

  const testDir = "tests/data/test-sync";
  const inputDir = testDir;

  // Create test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  // Create media directories
  const mediaTypes = ["image", "document", "video", "audio"];
  mediaTypes.forEach((type) => {
    const dir = path.join(inputDir, type);
    fs.mkdirSync(dir, { recursive: true });

    // Create sample files
    fs.writeFileSync(
      path.join(dir, `sample.${type === "image" ? "jpg" : "mp4"}`),
      `Sample ${type} content`
    );
  });

  // Create JSON data with some messages
  const jsonData = [
    {
      country: "Test Country",
      phoneNum: "+1234567890",
      formattedName: "Test User",
      messageTime: "2025-01-01 12:00:00",
      messageType: "chat",
      messageBody: "Hello from JSON!",
      messageId: "json_001",
    },
    {
      country: "Test Country",
      phoneNum: "+1234567890",
      formattedName: "Test User",
      messageTime: "2025-01-01 12:05:00",
      messageType: "image",
      messageBody: "sample.jpg",
      messageId: "json_002",
    },
  ];

  fs.writeFileSync(
    path.join(inputDir, "chats.json"),
    JSON.stringify(jsonData, null, 2)
  );

  // Create native backup directory and file
  const nativeDir = path.join(inputDir, "native_backups");
  fs.mkdirSync(nativeDir, { recursive: true });

  const nativeContent = `1/1/25, 12:00 - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. Learn more.
1/1/25, 12:00 - 
1/1/25, 12:00 - Test User: Hello from JSON!
1/1/25, 12:02 - Test User: Hello from Native!
[01.01.2025, 12:07:30] Test User: Hello with EU brackets format!
01.01.2025, 12:10:15 Test User: Hello with EU no-brackets format!
1/1/25, 12:05 - Test User: sample.jpg (file attached)
1/1/25, 12:08 - Test User: document.pdf (file attached)`;

  fs.writeFileSync(
    path.join(nativeDir, "WhatsApp Chat with +12 345 67 89 0.txt"),
    nativeContent
  );

  console.log(`✅ Test data created in: ${testDir}/`);
  console.log(`📄 JSON messages: ${jsonData.length}`);
  console.log(`📄 Native file created with multiple date formats`);
  console.log(`📁 Media directories: ${mediaTypes.join(", ")}\n`);

  return testDir;
}

function testSync() {
  const testDir = createTestData();

  console.log("=== Testing Synchronization ===\n");

  // Show initial state
  console.log("📊 Initial state:");
  const jsonPath = path.join(testDir, "chats.json");
  const nativePath = path.join(
    testDir,
    "native_backups",
    "WhatsApp Chat with +12 345 67 89 0.txt"
  );

  const initialJson = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const initialNative = fs
    .readFileSync(nativePath, "utf8")
    .split("\n")
    .filter((line) => line.trim() && !line.includes("encrypted"));

  console.log(`   JSON: ${initialJson.length} messages`);
  console.log(`   Native: ${initialNative.length} lines\n`);

  // Run synchronization
  try {
    syncFormats(testDir);

    // Show final state
    console.log("\n📊 Final state:");
    const finalJson = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const finalNative = fs
      .readFileSync(nativePath, "utf8")
      .split("\n")
      .filter((line) => line.trim() && !line.includes("encrypted"));

    console.log(`   JSON: ${finalJson.length} messages`);
    console.log(`   Native: ${finalNative.length} lines`);

    console.log("\n🔍 Sample synchronized messages:");
    finalJson.slice(0, 3).forEach((msg) => {
      console.log(
        `   ${msg.messageTime} - ${msg.formattedName}: ${msg.messageBody}`
      );
    });
  } catch (error) {
    console.error("❌ Sync failed:", error.message);
  }

  console.log(`\n📁 Test files saved in: ${testDir}/`);
}

if (require.main === module) {
  testSync();
}
