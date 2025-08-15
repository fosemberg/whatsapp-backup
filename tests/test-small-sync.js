const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const { syncFormats } = require("../src/sync_formats");

describe("WhatsApp Small Sync Test", function () {
  const testDir = "tests/data/test-small-sync";

  function createSmallTestData() {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Create minimal JSON data
    const jsonData = [
      {
        messageId: "json1",
        messageTime: "2025-01-01 12:00:00",
        messageType: "chat",
        messageBody: "Hello from JSON!",
        formattedName: "You",
        phoneNum: "+15551234567890",
        displayName: "You",
      },
      {
        messageId: "json2",
        messageTime: "2025-01-01 12:01:00",
        messageType: "chat",
        messageBody: "Hi there!",
        formattedName: "Alice Johnson",
        phoneNum: "+15559876543210",
        displayName: "Alice",
      },
    ];

    fs.writeFileSync(
      path.join(testDir, "chats.json"),
      JSON.stringify(jsonData, null, 2)
    );

    // Create native file with one duplicate and one new message
    const nativeDir = path.join(testDir, "native_backups");
    fs.mkdirSync(nativeDir, { recursive: true });

    const nativeContent = `1/1/25, 12:00 - Mike: Hello from JSON!
1/1/25, 12:01 - Alice: Hi there!
1/1/25, 12:02 - Alice: New message from native`;

    fs.writeFileSync(
      path.join(nativeDir, "WhatsApp Chat with +15551234567890.txt"),
      nativeContent
    );

    // Create media directories
    const mediaTypes = ["image", "document", "video", "audio"];
    mediaTypes.forEach((type) => {
      fs.mkdirSync(path.join(testDir, type), { recursive: true });
    });

    return {
      jsonMessages: jsonData.length,
      nativeMessages: nativeContent.split("\n").length,
      expectedResult: 3, // 2 unique from JSON + 1 unique from native
    };
  }

  before(function () {
    this.testStats = createSmallTestData();
    console.log(`    ✅ Small test data created:`);
    console.log(`       📄 JSON: ${this.testStats.jsonMessages} messages`);
    console.log(
      `       📄 Native: ${this.testStats.nativeMessages} messages (1 duplicate expected)`
    );
    console.log(
      `       🎯 Expected result: ${this.testStats.expectedResult} unique messages total`
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
    it("should have created small test dataset", function () {
      expect(fs.existsSync(testDir)).to.be.true;
      expect(fs.existsSync(path.join(testDir, "chats.json"))).to.be.true;
      expect(
        fs.existsSync(
          path.join(
            testDir,
            "native_backups",
            "WhatsApp Chat with +15551234567890.txt"
          )
        )
      ).to.be.true;
    });

    it("should have correct initial message counts", function () {
      const jsonData = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );
      expect(jsonData.length).to.equal(2);

      const nativeContent = fs.readFileSync(
        path.join(
          testDir,
          "native_backups",
          "WhatsApp Chat with +15551234567890.txt"
        ),
        "utf8"
      );
      expect(nativeContent.split("\n").length).to.equal(3);
    });
  });

  describe("Small sync execution", function () {
    it("should perform sync correctly", function () {
      const beforeJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );
      const beforeSize = fs.statSync(path.join(testDir, "chats.json")).size;

      console.log(`    === BEFORE SYNC ===`);
      console.log(`    JSON messages before: ${beforeJson.length}`);
      console.log(`    JSON file size before: ${beforeSize} bytes`);
      console.log(`    🚀 Running sync...`);

      expect(() => {
        syncFormats(testDir);
      }).to.not.throw();

      const afterJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );
      const afterSize = fs.statSync(path.join(testDir, "chats.json")).size;

      console.log(`    === AFTER SYNC ===`);
      console.log(`    JSON messages after: ${afterJson.length}`);
      console.log(`    JSON file size after: ${afterSize} bytes`);

      expect(afterJson.length).to.be.greaterThan(beforeJson.length);
      expect(afterJson.length).to.equal(3); // Should be exactly 3 after deduplication
    });

    it("should contain all expected messages", function () {
      const finalJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      console.log(`    Messages:`);
      finalJson.forEach((msg, index) => {
        const preview =
          msg.messageBody.length > 30
            ? msg.messageBody.substring(0, 30) + "..."
            : msg.messageBody;
        console.log(`    ${index + 1}. ${msg.formattedName}: ${preview}`);
      });

      const bodies = finalJson.map((msg) => msg.messageBody);
      expect(bodies).to.include("Hello from JSON!");
      expect(bodies).to.include("Hi there!");
      expect(bodies).to.include("New message from native");
    });

    it("should maintain chronological order", function () {
      const finalJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      for (let i = 1; i < finalJson.length; i++) {
        const prevTime = new Date(finalJson[i - 1].messageTime);
        const currTime = new Date(finalJson[i].messageTime);
        expect(currTime.getTime()).to.be.greaterThanOrEqual(prevTime.getTime());
      }
    });

    it("should handle sender name mapping correctly", function () {
      const finalJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      // Check that we have messages from expected senders
      const senders = finalJson.map((msg) => msg.formattedName);
      const uniqueSenders = [...new Set(senders)];

      expect(uniqueSenders.length).to.be.greaterThan(1); // Should have multiple senders
    });
  });

  describe("Deduplication verification", function () {
    it("should not create duplicates on second run", function () {
      const beforeSecondRun = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      expect(() => {
        syncFormats(testDir);
      }).to.not.throw();

      const afterSecondRun = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      // Should have same count after second run
      expect(afterSecondRun.length).to.equal(beforeSecondRun.length);
    });
  });
});
