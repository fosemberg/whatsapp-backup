#!/usr/bin/env node

/**
 * Small test to debug the sync issue
 */

const fs = require("fs");
const path = require("path");
const { syncFormats } = require("../src/sync_formats");

function createSmallTest() {
  const testDir = "tests/data/test-small-sync";

  // Clean up and create test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  // Create small JSON with 2 messages
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
      formattedName: "Alice Johnson",
      displayName: "Alice",
      messageTime: "2025-01-01 12:05:00",
      messageType: "chat",
      messageBody: "Hi there!",
      messageId: "msg_002",
    },
  ];

  fs.writeFileSync(
    path.join(testDir, "chats.json"),
    JSON.stringify(jsonData, null, 2)
  );

  // Create native file with 3 messages (1 duplicate, 2 new)
  const nativeDir = path.join(testDir, "native_backups");
  fs.mkdirSync(nativeDir, { recursive: true });

  const nativeContent = `1/1/25, 12:00 - Mike: Hello from JSON!
1/1/25, 12:05 - Alice: Hi there!  
1/1/25, 12:10 - Alice: New message from native`;

  fs.writeFileSync(
    path.join(nativeDir, "WhatsApp Chat with +15551234567890.txt"),
    nativeContent
  );

  console.log(`✅ Small test data created:`);
  console.log(`   📄 JSON: ${jsonData.length} messages`);
  console.log(`   📄 Native: 3 messages (1 duplicate expected)`);
  console.log(`   🎯 Expected result: 3 unique messages total\n`);

  return testDir;
}

function debugSmallSync() {
  const testDir = createSmallTest();

  console.log("=== BEFORE SYNC ===");
  const beforeJson = JSON.parse(
    fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
  );
  console.log(`JSON messages before: ${beforeJson.length}`);
  console.log(
    `JSON file size before: ${
      fs.statSync(path.join(testDir, "chats.json")).size
    } bytes`
  );

  try {
    console.log("\n🚀 Running sync...");
    syncFormats(testDir);

    console.log("\n=== AFTER SYNC ===");
    if (fs.existsSync(path.join(testDir, "chats.json"))) {
      const afterJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );
      console.log(`JSON messages after: ${afterJson.length}`);
      console.log(
        `JSON file size after: ${
          fs.statSync(path.join(testDir, "chats.json")).size
        } bytes`
      );

      console.log("\nMessages:");
      afterJson.forEach((msg, i) => {
        console.log(
          `${i + 1}. ${msg.formattedName}: ${msg.messageBody?.substring(
            0,
            40
          )}...`
        );
      });
    }
  } catch (error) {
    console.error("❌ Sync failed:", error.message);
  }

  console.log(`\n📁 Test files saved in: ${testDir}/`);
}

if (require.main === module) {
  debugSmallSync();
}

module.exports = { debugSmallSync };
