#!/usr/bin/env node

/**
 * Test to demonstrate proper directory structure for WhatsApp attachments
 */

const fs = require("fs");
const path = require("path");
const { convertJsonToNative } = require("../src/json-to-native-converter");
const { convertNativeToJson } = require("../src/native-to-json-converter");

function createTestData() {
  console.log("=== Creating test data with proper directory structure ===\n");

  const testDir = "tests/data/test-structure";
  const inputDir = path.join(testDir, "input");
  const outputDir = path.join(testDir, "output");

  // Create directories
  [testDir, inputDir, outputDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create proper directory structure
  const mediaTypes = ["image", "document", "video", "audio"];
  mediaTypes.forEach((type) => {
    const dir = path.join(inputDir, type);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create sample files for each type
  const sampleFiles = {
    image: ["photo1.jpg", "screenshot.png"],
    document: ["document.pdf", "code.js"],
    video: ["video1.mp4", "clip.avi"],
    audio: ["audio1.mp3", "voice.wav"],
  };

  Object.entries(sampleFiles).forEach(([type, files]) => {
    files.forEach((filename) => {
      const filePath = path.join(inputDir, type, filename);
      fs.writeFileSync(filePath, `Sample ${type} file: ${filename}`);
    });
  });

  // Create sample JSON with different message types
  const sampleJson = [
    {
      country: "Test Country",
      phoneNum: "+1234567890",
      formattedName: "Test User",
      messageTime: "2025-01-01 12:00:00",
      messageType: "chat",
      messageBody: "Hello world!",
      messageId: "test_001",
    },
    {
      country: "Test Country",
      phoneNum: "+1234567890",
      formattedName: "Test User",
      messageTime: "2025-01-01 12:01:00",
      messageType: "image",
      messageBody: "photo1.jpg",
      messageId: "test_002",
    },
    {
      country: "Test Country",
      phoneNum: "+1234567890",
      formattedName: "Test User",
      messageTime: "2025-01-01 12:02:00",
      messageType: "document",
      messageBody: "document.pdf",
      messageId: "test_003",
    },
    {
      country: "Test Country",
      phoneNum: "+1234567890",
      formattedName: "Test User",
      messageTime: "2025-01-01 12:03:00",
      messageType: "video",
      messageBody: "video1.mp4",
      messageId: "test_004",
    },
    {
      country: "Test Country",
      phoneNum: "+1234567890",
      formattedName: "Test User",
      messageTime: "2025-01-01 12:04:00",
      messageType: "audio",
      messageBody: "audio1.mp3",
      messageId: "test_005",
    },
  ];

  const jsonPath = path.join(inputDir, "chats.json");
  fs.writeFileSync(jsonPath, JSON.stringify(sampleJson, null, 2));

  console.log("✅ Test data created:");
  console.log(`   Input directory: ${inputDir}`);
  console.log(`   JSON file: ${jsonPath}`);
  console.log(`   Media directories: ${mediaTypes.join(", ")}`);

  return { inputDir, outputDir, jsonPath };
}

function testDirectoryStructure() {
  const { inputDir, outputDir, jsonPath } = createTestData();

  console.log(
    "\n=== Testing JSON to Native (with proper source structure) ==="
  );

  // Test 1: JSON to Native
  const nativeOutputPath = path.join(outputDir, "converted.txt");
  const nativeAttachmentsDir = path.join(outputDir, "attachments-flat");

  try {
    convertJsonToNative(jsonPath, nativeOutputPath, nativeAttachmentsDir);
    console.log("✅ JSON to Native conversion successful!");
    console.log(`   Output: ${nativeOutputPath}`);
    console.log(`   Attachments: ${nativeAttachmentsDir}/`);

    // Show copied files
    if (fs.existsSync(nativeAttachmentsDir)) {
      const copiedFiles = fs.readdirSync(nativeAttachmentsDir);
      console.log(`   Copied files: ${copiedFiles.join(", ")}`);
    }
  } catch (error) {
    console.log("❌ JSON to Native conversion failed:", error.message);
  }

  console.log(
    "\n=== Testing Native to JSON (creating proper target structure) ==="
  );

  // Test 2: Native to JSON
  const jsonOutputPath = path.join(outputDir, "converted.json");

  try {
    convertNativeToJson(nativeOutputPath, jsonOutputPath, nativeAttachmentsDir);
    console.log("✅ Native to JSON conversion successful!");
    console.log(`   Output: ${jsonOutputPath}`);

    // Check if proper directory structure was created
    const baseDir = path.dirname(jsonOutputPath);
    const expectedDirs = ["image", "document", "video", "audio"];

    console.log("   Created directories:");
    expectedDirs.forEach((dir) => {
      const dirPath = path.join(baseDir, dir);
      if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);
        console.log(`     ${dir}/: ${files.join(", ") || "(empty)"}`);
      } else {
        console.log(`     ${dir}/: (not created)`);
      }
    });
  } catch (error) {
    console.log("❌ Native to JSON conversion failed:", error.message);
  }

  console.log("\n=== Directory Structure Test Complete ===");
  console.log(`\nResults saved in: ${outputDir}/`);
}

if (require.main === module) {
  testDirectoryStructure();
}
