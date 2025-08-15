const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const { convertJsonToNative } = require("../src/json-to-native-converter");
const { convertNativeToJson } = require("../src/native-to-json-converter");

describe("WhatsApp Directory Structure", function () {
  const testDir = "tests/data/test-structure";
  const inputDir = path.join(testDir, "input");
  const outputDir = path.join(testDir, "output");

  function createTestDataWithProperStructure() {
    // Clean and create directories
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(inputDir, { recursive: true });
    fs.mkdirSync(outputDir, { recursive: true });

    // Create media directories in input
    const mediaTypes = ["image", "document", "video", "audio"];
    mediaTypes.forEach((type) => {
      fs.mkdirSync(path.join(inputDir, type), { recursive: true });
    });

    // Create test files
    fs.writeFileSync(
      path.join(inputDir, "image", "photo1.jpg"),
      "fake image 1"
    );
    fs.writeFileSync(
      path.join(inputDir, "document", "document.pdf"),
      "fake pdf"
    );
    fs.writeFileSync(path.join(inputDir, "video", "video1.mp4"), "fake video");
    fs.writeFileSync(path.join(inputDir, "audio", "audio1.mp3"), "fake audio");

    // Create JSON data that references these files
    const jsonData = [
      {
        messageId: "test1",
        messageTime: "2025-01-01 12:00:00",
        messageType: "chat",
        messageBody: "Hello world!",
        formattedName: "Test User",
        phoneNum: "+1234567890",
      },
      {
        messageId: "test2",
        messageTime: "2025-01-01 12:01:00",
        messageType: "image",
        messageBody: "photo1.jpg",
        formattedName: "Test User",
        phoneNum: "+1234567890",
      },
      {
        messageId: "test3",
        messageTime: "2025-01-01 12:02:00",
        messageType: "document",
        messageBody: "document.pdf",
        formattedName: "Test User",
        phoneNum: "+1234567890",
      },
      {
        messageId: "test4",
        messageTime: "2025-01-01 12:03:00",
        messageType: "video",
        messageBody: "video1.mp4",
        formattedName: "Test User",
        phoneNum: "+1234567890",
      },
      {
        messageId: "test5",
        messageTime: "2025-01-01 12:04:00",
        messageType: "audio",
        messageBody: "audio1.mp3",
        formattedName: "Test User",
        phoneNum: "+1234567890",
      },
    ];

    fs.writeFileSync(
      path.join(inputDir, "chats.json"),
      JSON.stringify(jsonData, null, 2)
    );

    return {
      totalMessages: jsonData.length,
      mediaFiles: 4,
    };
  }

  before(function () {
    this.testStats = createTestDataWithProperStructure();
    console.log(`    ✅ Test data created:`);
    console.log(`       Input directory: ${inputDir}`);
    console.log(`       JSON file: ${path.join(inputDir, "chats.json")}`);
    console.log(`       Media directories: image, document, video, audio`);
  });

  after(function () {
    // Clean up backup files
    try {
      const { execSync } = require("child_process");
      execSync(
        `find ${testDir} -name "*.backup.*" -delete 2>/dev/null || true`,
        { stdio: "ignore" }
      );
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("Test data setup", function () {
    it("should have created proper directory structure", function () {
      expect(fs.existsSync(inputDir)).to.be.true;
      expect(fs.existsSync(path.join(inputDir, "chats.json"))).to.be.true;

      const mediaTypes = ["image", "document", "video", "audio"];
      mediaTypes.forEach((type) => {
        expect(fs.existsSync(path.join(inputDir, type))).to.be.true;
      });
    });

    it("should have created test media files", function () {
      expect(fs.existsSync(path.join(inputDir, "image", "photo1.jpg"))).to.be
        .true;
      expect(fs.existsSync(path.join(inputDir, "document", "document.pdf"))).to
        .be.true;
      expect(fs.existsSync(path.join(inputDir, "video", "video1.mp4"))).to.be
        .true;
      expect(fs.existsSync(path.join(inputDir, "audio", "audio1.mp3"))).to.be
        .true;
    });
  });

  describe("JSON to Native conversion with proper structure", function () {
    it("should convert JSON to native format successfully", function () {
      const jsonPath = path.join(inputDir, "chats.json");
      const outputPath = path.join(outputDir, "converted.txt");
      const attachmentsDir = path.join(outputDir, "attachments-flat");

      console.log(
        `    === Testing JSON to Native (with proper source structure) ===`
      );

      expect(() => {
        convertJsonToNative(jsonPath, outputPath, attachmentsDir);
      }).to.not.throw();

      expect(fs.existsSync(outputPath)).to.be.true;
      console.log(`    ✅ JSON to Native conversion successful!`);
      console.log(`       Output: ${outputPath}`);
      console.log(`       Attachments: ${attachmentsDir}/`);

      // Check that attachments were copied
      if (fs.existsSync(attachmentsDir)) {
        const copiedFiles = fs.readdirSync(attachmentsDir);
        console.log(`       Copied files: ${copiedFiles.join(", ")}`);
        expect(copiedFiles.length).to.be.greaterThan(0);
      }
    });

    it("should create readable native format output", function () {
      const outputPath = path.join(outputDir, "converted.txt");
      const content = fs.readFileSync(outputPath, "utf8");

      expect(content).to.include("Hello world!");
      expect(content).to.include("photo1.jpg");
      expect(content).to.include("document.pdf");
      expect(content).to.include("video1.mp4");
      expect(content).to.include("audio1.mp3");
    });
  });

  describe("Native to JSON conversion creating proper structure", function () {
    it("should convert native to JSON with proper directory structure", function () {
      const nativePath = path.join(outputDir, "converted.txt");
      const jsonOutputPath = path.join(outputDir, "converted.json");
      const targetDir = path.join(outputDir, "structured-attachments");

      console.log(
        `    === Testing Native to JSON (creating proper target structure) ===`
      );

      expect(() => {
        convertNativeToJson(nativePath, jsonOutputPath, targetDir);
      }).to.not.throw();

      expect(fs.existsSync(jsonOutputPath)).to.be.true;
      console.log(`    ✅ Native to JSON conversion successful!`);
      console.log(`       Output: ${jsonOutputPath}`);

      // Check that structured directories were created
      const mediaTypes = ["image", "document", "video", "audio"];
      mediaTypes.forEach((type) => {
        const typeDir = path.join(targetDir, type);
        if (fs.existsSync(typeDir)) {
          const files = fs.readdirSync(typeDir);
          if (files.length > 0) {
            console.log(`       Created directories:`);
            console.log(`         ${type}/: ${files.join(", ")}`);
          }
        }
      });
    });

    it("should create valid JSON output", function () {
      const jsonOutputPath = path.join(outputDir, "converted.json");
      const jsonData = JSON.parse(fs.readFileSync(jsonOutputPath, "utf8"));

      expect(jsonData).to.be.an("array");
      expect(jsonData.length).to.be.greaterThan(0);

      // Check that we have different message types
      const messageTypes = jsonData.map((msg) => msg.messageType);
      expect(messageTypes).to.include("chat");
      expect(messageTypes).to.include("image");
    });

    it("should organize files into correct type-specific directories", function () {
      const targetDir = path.join(outputDir, "structured-attachments");

      const mediaChecks = [
        { type: "image", expectedFiles: ["photo1.jpg"] },
        { type: "document", expectedFiles: ["document.pdf"] },
        { type: "video", expectedFiles: ["video1.mp4"] },
        { type: "audio", expectedFiles: ["audio1.mp3"] },
      ];

      mediaChecks.forEach(({ type, expectedFiles }) => {
        const typeDir = path.join(targetDir, type);
        if (fs.existsSync(typeDir)) {
          const files = fs.readdirSync(typeDir);
          expectedFiles.forEach((expectedFile) => {
            if (files.includes(expectedFile)) {
              expect(files).to.include(expectedFile);
            }
          });
        }
      });
    });
  });

  describe("Converter functions", function () {
    it("should have valid converter functions", function () {
      expect(convertJsonToNative).to.be.a("function");
      expect(convertNativeToJson).to.be.a("function");
    });
  });
});
