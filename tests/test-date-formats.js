const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const { syncFormats } = require("../src/sync_formats");

describe("WhatsApp Date Format Preservation", function () {
  const testDir = "tests/data/test-dates";

  function createTestDataWithMixedDates() {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Create native file with mixed date formats
    const nativeDir = path.join(testDir, "native_backups");
    fs.mkdirSync(nativeDir, { recursive: true });

    const mixedDateContent = `1/1/25, 12:00 - Test User: US format message
[01.01.2025, 12:05:30] Test User: EU format with brackets
01.01.2025, 12:10:15 Test User: EU format without brackets
1/1/25, 12:15 - Test User: Another US format message
[01.01.2025, 12:20:45] Test User: Another EU bracket message
01.01.2025, 12:25:30 Test User: Another EU no-bracket message`;

    fs.writeFileSync(
      path.join(nativeDir, "WhatsApp Chat with +12 345 67 89 0.txt"),
      mixedDateContent
    );

    // Create media directories
    const mediaTypes = ["image", "document", "video", "audio"];
    mediaTypes.forEach((type) => {
      fs.mkdirSync(path.join(testDir, type), { recursive: true });
    });

    return {
      totalMessages: mixedDateContent.split("\n").length,
      usFormatCount: (
        mixedDateContent.match(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2}/g) || []
      ).length,
      euBracketCount: (
        mixedDateContent.match(/\[\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2}\]/g) ||
        []
      ).length,
      euNoBracketCount: (
        mixedDateContent.match(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2}/gm) ||
        []
      ).length,
    };
  }

  before(function () {
    this.dateStats = createTestDataWithMixedDates();
    console.log(`    ✅ Test data created with mixed date formats:`);
    console.log(`       - US format: ${this.dateStats.usFormatCount} messages`);
    console.log(
      `       - EU with brackets: ${this.dateStats.euBracketCount} messages`
    );
    console.log(
      `       - EU without brackets: ${this.dateStats.euNoBracketCount} messages`
    );
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
    it("should have created test directory with mixed date formats", function () {
      expect(fs.existsSync(testDir)).to.be.true;

      const nativePath = path.join(
        testDir,
        "native_backups",
        "WhatsApp Chat with +12 345 67 89 0.txt"
      );
      expect(fs.existsSync(nativePath)).to.be.true;

      const content = fs.readFileSync(nativePath, "utf8");
      expect(content).to.include("1/1/25, 12:00"); // US format
      expect(content).to.include("[01.01.2025, 12:05:30]"); // EU with brackets
      expect(content).to.include("01.01.2025, 12:10:15"); // EU without brackets
    });

    it("should have correct date format counts", function () {
      expect(this.dateStats.usFormatCount).to.be.greaterThan(0);
      expect(this.dateStats.euBracketCount).to.be.greaterThan(0);
      expect(this.dateStats.euNoBracketCount).to.be.greaterThan(0);
    });
  });

  describe("Synchronization with date preservation", function () {
    it("should run synchronization without errors", function () {
      expect(() => {
        syncFormats(testDir);
      }).to.not.throw();
    });

    it("should preserve original date formats in output", function () {
      const outputPath = path.join(
        testDir,
        "native_backups",
        "WhatsApp Chat with +12 345 67 89 0.txt"
      );
      expect(fs.existsSync(outputPath)).to.be.true;

      const outputContent = fs.readFileSync(outputPath, "utf8");
      const lines = outputContent.split("\n");

      console.log(`    === Analyzing Output ===`);
      console.log(`    Output lines:`);

      let preservedFormats = {
        us: 0,
        euBracket: 0,
        euNoBracket: 0,
      };

      lines.forEach((line, index) => {
        if (line.trim()) {
          console.log(
            `    ${index + 1}: ${line.substring(0, 60)}${
              line.length > 60 ? "..." : ""
            }`
          );

          // Check format preservation
          if (line.match(/\d{1,2}\/\d{1,2}\/\d{2}, \d{1,2}:\d{2}/)) {
            preservedFormats.us++;
            console.log(`         ✅ US format preserved`);
          } else if (line.match(/\[\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2}\]/)) {
            preservedFormats.euBracket++;
            console.log(`         ✅ EU format with brackets preserved`);
          } else if (line.match(/^\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}:\d{2}/)) {
            preservedFormats.euNoBracket++;
            console.log(`         ✅ EU format without brackets preserved`);
          }
        }
      });

      // Verify that each format type was preserved
      expect(preservedFormats.us).to.be.greaterThan(
        0,
        "US format should be preserved"
      );
      expect(preservedFormats.euBracket).to.be.greaterThan(
        0,
        "EU bracket format should be preserved"
      );
      expect(preservedFormats.euNoBracket).to.be.greaterThan(
        0,
        "EU no-bracket format should be preserved"
      );
    });

    it("should create properly formatted JSON output", function () {
      const jsonPath = path.join(testDir, "chats.json");
      expect(fs.existsSync(jsonPath)).to.be.true;

      const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      expect(jsonData).to.be.an("array");
      expect(jsonData.length).to.be.greaterThan(0);

      // Check that all messages have proper ISO format timestamps
      jsonData.forEach((msg) => {
        expect(msg.messageTime).to.match(
          /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
        );
      });
    });
  });

  describe("Date format validation", function () {
    it("should maintain chronological order regardless of original format", function () {
      const jsonPath = path.join(testDir, "chats.json");
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

      // Check chronological order
      for (let i = 1; i < jsonData.length; i++) {
        const prevTime = new Date(jsonData[i - 1].messageTime);
        const currTime = new Date(jsonData[i].messageTime);
        expect(currTime.getTime()).to.be.greaterThanOrEqual(prevTime.getTime());
      }
    });
  });
});
