#!/usr/bin/env node

/**
 * Test script for deduplication functionality
 * Tests what happens when sync is run multiple times
 */

const fs = require("fs");
const path = require("path");
const { syncFormats } = require("../src/sync_formats");

function createTestDataForDeduplication() {
  console.log("=== Testing Deduplication ===\n");

  const testDir = "tests/data/test-dedup";

  // Clean up and create test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  // Create JSON with some messages
  const jsonData = [
    {
      country: "Test Country",
      phoneNum: "+1234567890",
      formattedName: "User A",
      messageTime: "2025-01-01 12:00:00",
      messageType: "chat",
      messageBody: "First message",
      messageId: "msg_001",
    },
    {
      country: "Test Country",
      phoneNum: "+1234567890",
      formattedName: "User B",
      messageTime: "2025-01-01 12:05:00",
      messageType: "chat",
      messageBody: "Second message",
      messageId: "msg_002",
    },
    {
      country: "Test Country",
      phoneNum: "+1234567890",
      formattedName: "User A",
      messageTime: "2025-01-01 12:10:00",
      messageType: "image",
      messageBody: "photo.jpg",
      messageId: "msg_003",
    },
  ];

  fs.writeFileSync(
    path.join(testDir, "chats.json"),
    JSON.stringify(jsonData, null, 2)
  );

  // Create native file with some overlapping messages
  const nativeDir = path.join(testDir, "native_backups");
  fs.mkdirSync(nativeDir, { recursive: true });

  const nativeContent = `1/1/25, 12:00 - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. Learn more.
1/1/25, 12:00 - 
1/1/25, 12:00 - User A: First message
1/1/25, 12:05 - User B: Second message
1/1/25, 12:07 - User C: Third message (only in native)
1/1/25, 12:10 - User A: photo.jpg (file attached)
1/1/25, 12:15 - User B: Fourth message (only in native)`;

  fs.writeFileSync(
    path.join(nativeDir, "WhatsApp Chat with +12 345 67 89 0.txt"),
    nativeContent
  );

  console.log(`✅ Test data created:`);
  console.log(`   📄 JSON: ${jsonData.length} messages`);
  console.log(`   📄 Native: 5 messages (2 overlap, 2 unique)`);
  console.log(`   📊 Expected after merge: 5 unique messages\n`);

  return testDir;
}

function analyzeResults(testDir, runNumber) {
  console.log(`\n=== Analysis after run #${runNumber} ===`);

  const jsonPath = path.join(testDir, "chats.json");
  const nativePath = path.join(
    testDir,
    "native_backups",
    "WhatsApp Chat with +12 345 67 89 0.txt"
  );

  if (fs.existsSync(jsonPath)) {
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    console.log(`📄 JSON messages: ${jsonData.length}`);

    // Check for duplicates by content
    const contentSet = new Set();
    let duplicates = 0;

    jsonData.forEach((msg) => {
      const key = `${msg.formattedName}:${msg.messageType}:${msg.messageBody}`;
      if (contentSet.has(key)) {
        duplicates++;
      } else {
        contentSet.add(key);
      }
    });

    console.log(`   🔍 Unique content: ${contentSet.size}`);
    console.log(`   ⚠️  Duplicates found: ${duplicates}`);
  }

  if (fs.existsSync(nativePath)) {
    const nativeContent = fs.readFileSync(nativePath, "utf8");
    const lines = nativeContent
      .split("\n")
      .filter(
        (line) =>
          line.trim() && !line.includes("encrypted") && line.includes(":")
      );
    console.log(`📄 Native lines: ${lines.length}`);
  }
}

function testDeduplication() {
  const testDir = createTestDataForDeduplication();

  try {
    // First sync
    console.log("🚀 Running first sync...");
    syncFormats(testDir);
    analyzeResults(testDir, 1);

    // Second sync (this should not add duplicates)
    console.log("\n🚀 Running second sync...");
    syncFormats(testDir);
    analyzeResults(testDir, 2);

    // Third sync (just to be sure)
    console.log("\n🚀 Running third sync...");
    syncFormats(testDir);
    analyzeResults(testDir, 3);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }

  console.log(`\n📁 Test files saved in: ${testDir}/`);
}

if (require.main === module) {
  testDeduplication();
}

module.exports = { testDeduplication };
