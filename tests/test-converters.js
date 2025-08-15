#!/usr/bin/env node

/**
 * Test script for WhatsApp format converters
 * Demonstrates conversion between JSON and native text formats
 */

const fs = require("fs");
const path = require("path");
const { convertJsonToNative } = require("../src/json-to-native-converter");
const { convertNativeToJson } = require("../src/native-to-json-converter");

function testConverters() {
  console.log("=== WhatsApp Format Converter Test ===\n");

  // Test paths
  const testDir = "tests/data/test-output";
  const inputJsonPath = "data/input/2025/1234567890___Test-Chat/chats.json";
  const inputNativePath =
    "data/input/2025/1234567890___Test-Chat/native_backups/WhatsApp Chat with +12 345 67 89 0.txt";

  // Create test output directory
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  console.log("1. Testing JSON to Native conversion...");

  if (fs.existsSync(inputJsonPath)) {
    try {
      const outputNativePath = path.join(testDir, "converted-from-json.txt");
      const attachmentsFromJsonDir = path.join(
        testDir,
        "attachments-from-json"
      );

      convertJsonToNative(
        inputJsonPath,
        outputNativePath,
        attachmentsFromJsonDir
      );
      console.log(`✅ JSON to Native conversion successful!`);
      console.log(`   Output: ${outputNativePath}`);
      console.log(`   Attachments: ${attachmentsFromJsonDir}`);
    } catch (error) {
      console.log(`❌ JSON to Native conversion failed: ${error.message}`);
    }
  } else {
    console.log(`⚠️  Input JSON file not found: ${inputJsonPath}`);
  }

  console.log("\n2. Testing Native to JSON conversion...");

  if (fs.existsSync(inputNativePath)) {
    try {
      const outputJsonPath = path.join(testDir, "converted-from-native.json");
      const attachmentsFromNativeDir = path.join(
        testDir,
        "attachments-from-native"
      );

      convertNativeToJson(
        inputNativePath,
        outputJsonPath,
        attachmentsFromNativeDir
      );
      console.log(`✅ Native to JSON conversion successful!`);
      console.log(`   Output: ${outputJsonPath}`);
      console.log(`   Attachments: ${attachmentsFromNativeDir}`);
    } catch (error) {
      console.log(`❌ Native to JSON conversion failed: ${error.message}`);
    }
  } else {
    console.log(`⚠️  Input native file not found: ${inputNativePath}`);
  }

  console.log("\n=== Test Complete ===");
  console.log(`\nResults saved in: ${testDir}/`);
  console.log("\nTo use the converters manually:");
  console.log("\nJSON to Native:");
  console.log(
    "  node src/json-to-native-converter.js input.json output.txt [attachments_dir]"
  );
  console.log("\nNative to JSON:");
  console.log(
    "  node src/native-to-json-converter.js input.txt output.json [attachments_dir]"
  );
}

if (require.main === module) {
  testConverters();
}
