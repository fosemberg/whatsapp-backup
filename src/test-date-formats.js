#!/usr/bin/env node

/**
 * Test script specifically for date format preservation
 */

const fs = require("fs");
const path = require("path");
const { syncFormats } = require("./sync_formats");

function createTestDataWithMixedDates() {
  console.log("=== Testing Date Format Preservation ===\n");

  const testDir = "test-dates";

  // Clean up and create test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  // Create native file with mixed date formats
  const nativeDir = path.join(testDir, "native_backups");
  fs.mkdirSync(nativeDir, { recursive: true });

  const nativeContent = `1/1/25, 12:00 - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. Learn more.
1/1/25, 12:00 - 
1/1/25, 12:00 - Test User: US format message
[01.01.2025, 12:05:30] Test User: EU format with brackets
01.01.2025, 12:10:15 Test User: EU format without brackets
1/1/25, 12:15 - Test User: Another US format message
[01.01.2025, 12:20:45] Test User: Another EU bracket message
01.01.2025, 12:25:30 Test User: Another EU no-bracket message`;

  fs.writeFileSync(
    path.join(nativeDir, "WhatsApp Chat with +12 345 67 89 0.txt"),
    nativeContent
  );

  console.log(`✅ Test data created with mixed date formats:`);
  console.log(`   - US format: 1/1/25, 12:00`);
  console.log(`   - EU with brackets: [01.01.2025, 12:05:30]`);
  console.log(`   - EU without brackets: 01.01.2025, 12:10:15\n`);

  return testDir;
}

function analyzeOutput(testDir) {
  console.log("\n=== Analyzing Output ===\n");

  const nativePath = path.join(
    testDir,
    "native_backups",
    "WhatsApp Chat with +12 345 67 89 0.txt"
  );
  const content = fs.readFileSync(nativePath, "utf8");
  const lines = content
    .split("\n")
    .filter((line) => line.trim() && !line.includes("encrypted"));

  console.log("Output lines:");
  lines.forEach((line, index) => {
    if (line.includes("Test User:")) {
      console.log(`${index + 1}: ${line}`);

      // Check format
      if (line.match(/^\[/)) {
        console.log(`     ✅ EU format with brackets preserved`);
      } else if (line.match(/^\d{2}\.\d{2}\.\d{4}/)) {
        console.log(`     ✅ EU format without brackets preserved`);
      } else if (line.match(/^\d{1,2}\/\d{1,2}\/\d{2}/)) {
        console.log(`     ✅ US format preserved`);
      } else {
        console.log(`     ❌ Unknown format: ${line}`);
      }
    }
  });
}

function testDateFormats() {
  const testDir = createTestDataWithMixedDates();

  try {
    syncFormats(testDir);
    analyzeOutput(testDir);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }

  console.log(`\n📁 Test files saved in: ${testDir}/`);
}

if (require.main === module) {
  testDateFormats();
}

module.exports = { testDateFormats };
