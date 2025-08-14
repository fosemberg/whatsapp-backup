#!/usr/bin/env node

/**
 * Test script for smart deduplication without hardcoded names
 */

const fs = require("fs");
const path = require("path");
const { syncFormats } = require("./sync_formats");

function createUniversalTestData() {
  console.log("=== Testing Universal Smart Deduplication ===\n");

  const testDir = "test-smart-dedup";

  // Clean up and create test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  // Create JSON with various sender formats
  const jsonData = [
    {
      country: "Test Country",
      phoneNum: "+1555123456",
      formattedName: "You",
      messageTime: "2025-01-01 12:00:00",
      messageType: "chat",
      messageBody: "Hello from JSON!",
      messageId: "msg_001",
    },
    {
      country: "Test Country",
      phoneNum: "+1555987654",
      formattedName: "Alice Johnson Professional Chat",
      displayName: "Alice",
      messageTime: "2025-01-01 12:05:00",
      messageType: "chat",
      messageBody: "Hi there!",
      messageId: "msg_002",
    },
    {
      country: "Test Country",
      phoneNum: "+1555555555",
      formattedName: "Bob Smith Engineering Team Lead",
      displayName: "Bob",
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

  // Create native file with different sender representations
  const nativeDir = path.join(testDir, "native_backups");
  fs.mkdirSync(nativeDir, { recursive: true });

  const nativeContent = `1/1/25, 12:00 - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. Learn more.
1/1/25, 12:00 - 
1/1/25, 12:00 - Mike Smith: Hello from JSON!
1/1/25, 12:05 - Alice: Hi there!
1/1/25, 12:07 - +1555987654: New message only in native
1/1/25, 12:10 - Bob: photo.jpg (file attached)
1/1/25, 12:15 - +15551234567890: Another message from phone format`;

  fs.writeFileSync(
    path.join(nativeDir, "WhatsApp Chat with +15551234567890.txt"),
    nativeContent
  );

  console.log(`✅ Universal test data created:`);
  console.log(`   📄 JSON: ${jsonData.length} messages`);
  console.log(`   📄 Native: 5 messages`);
  console.log(
    `   🎯 Should auto-detect: You↔Mike Smith, Alice variants, phone formats\n`
  );

  return testDir;
}

function testSmartDeduplication() {
  const testDir = createUniversalTestData();

  try {
    console.log("🚀 Testing smart deduplication without hardcoded names...");
    syncFormats(testDir);

    // Analyze results
    console.log("\n📊 Results Analysis:");
    const jsonPath = path.join(testDir, "chats.json");
    if (fs.existsSync(jsonPath)) {
      const finalData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      console.log(`   Final message count: ${finalData.length}`);

      // Count unique senders
      const senders = new Set(finalData.map((msg) => msg.formattedName));
      console.log(`   Unique senders: ${senders.size}`);
      console.log(`   Senders: ${Array.from(senders).join(", ")}`);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }

  console.log(`\n📁 Test files saved in: ${testDir}/`);
}

if (require.main === module) {
  testSmartDeduplication();
}

module.exports = { testSmartDeduplication };
