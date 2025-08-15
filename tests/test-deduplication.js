const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const { syncFormats } = require("../src/sync_formats");

describe("WhatsApp Deduplication", function () {
  const testDir = "tests/data/test-dedup";

  function createTestDataForDeduplication() {
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
        messageId: "json1",
        displayName: "User A",
      },
      {
        country: "Test Country",
        phoneNum: "+1234567890",
        formattedName: "User B",
        messageTime: "2025-01-01 12:01:00",
        messageType: "chat",
        messageBody: "Second message",
        messageId: "json2",
        displayName: "User B",
      },
      {
        country: "Test Country",
        phoneNum: "+1234567890",
        formattedName: "User C",
        messageTime: "2025-01-01 12:02:00",
        messageType: "image",
        messageBody: "photo.jpg",
        messageId: "json3",
        displayName: "User C",
      },
    ];

    fs.writeFileSync(
      path.join(testDir, "chats.json"),
      JSON.stringify(jsonData, null, 2)
    );

    // Create native file with overlapping and unique messages
    const nativeBackupsDir = path.join(testDir, "native_backups");
    fs.mkdirSync(nativeBackupsDir, { recursive: true });

    const nativeContent = `1/1/25, 12:00 - User A: First message
1/1/25, 12:01 - User B: Second message
1/1/25, 12:02 - User C: photo.jpg (file attached)
1/1/25, 12:03 - User A: Third message (only in native)
1/1/25, 12:04 - User B: Fourth message (only in native)`;

    fs.writeFileSync(
      path.join(nativeBackupsDir, "WhatsApp Chat with +12 345 67 89 0.txt"),
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
      expectedUnique: 5, // 3 from JSON + 2 unique from native
    };
  }

  before(function () {
    this.testStats = createTestDataForDeduplication();
    console.log(`    ✅ Test data created:`);
    console.log(`    📄 JSON: ${this.testStats.jsonMessages} messages`);
    console.log(
      `    📄 Native: ${this.testStats.nativeMessages} messages (2 overlap, 2 unique)`
    );
    console.log(
      `    📊 Expected after merge: ${this.testStats.expectedUnique} unique messages`
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
    it("should have created test data correctly", function () {
      expect(fs.existsSync(testDir)).to.be.true;
      expect(fs.existsSync(path.join(testDir, "chats.json"))).to.be.true;
      expect(
        fs.existsSync(
          path.join(
            testDir,
            "native_backups",
            "WhatsApp Chat with +12 345 67 89 0.txt"
          )
        )
      ).to.be.true;
    });

    it("should have correct initial message counts", function () {
      const jsonData = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );
      expect(jsonData.length).to.equal(3);

      const nativeContent = fs.readFileSync(
        path.join(
          testDir,
          "native_backups",
          "WhatsApp Chat with +12 345 67 89 0.txt"
        ),
        "utf8"
      );
      expect(nativeContent.split("\n").length).to.equal(5);
    });
  });

  describe("First synchronization run", function () {
    it("should merge messages correctly on first run", function () {
      const beforeJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );
      console.log(`    🚀 Running first sync...`);

      expect(() => {
        syncFormats(testDir);
      }).to.not.throw();

      const afterJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      console.log(`    === Analysis after run #1 ===`);
      console.log(`    📄 JSON messages: ${afterJson.length}`);

      // Should have merged correctly - around 5 unique messages
      expect(afterJson.length).to.be.greaterThan(beforeJson.length);
      expect(afterJson.length).to.be.greaterThanOrEqual(5);
    });
  });

  describe("Second synchronization run (deduplication test)", function () {
    it("should not create duplicates on second run", function () {
      const beforeSecondRun = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      console.log(`    🚀 Running second sync...`);

      expect(() => {
        syncFormats(testDir);
      }).to.not.throw();

      const afterSecondRun = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      console.log(`    === Analysis after run #2 ===`);
      console.log(`    📄 JSON messages: ${afterSecondRun.length}`);

      // Should have same count - no new duplicates
      expect(afterSecondRun.length).to.equal(beforeSecondRun.length);
    });
  });

  describe("Third synchronization run (stability test)", function () {
    it("should remain stable on third run", function () {
      const beforeThirdRun = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      console.log(`    🚀 Running third sync...`);

      expect(() => {
        syncFormats(testDir);
      }).to.not.throw();

      const afterThirdRun = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      console.log(`    === Analysis after run #3 ===`);
      console.log(`    📄 JSON messages: ${afterThirdRun.length}`);

      // Should still have same count - complete stability
      expect(afterThirdRun.length).to.equal(beforeThirdRun.length);
    });
  });

  describe("Message content verification", function () {
    it("should have all expected unique messages", function () {
      const finalJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      // Check for presence of key messages
      const bodies = finalJson.map((msg) => msg.messageBody);
      expect(bodies).to.include("First message");
      expect(bodies).to.include("Second message");
      expect(bodies).to.include("photo.jpg");
      expect(bodies).to.include("Third message (only in native)");
      expect(bodies).to.include("Fourth message (only in native)");
    });

    it("should maintain chronological order", function () {
      const finalJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      // Check chronological order
      for (let i = 1; i < finalJson.length; i++) {
        const prevTime = new Date(finalJson[i - 1].messageTime);
        const currTime = new Date(finalJson[i].messageTime);
        expect(currTime.getTime()).to.be.greaterThanOrEqual(prevTime.getTime());
      }
    });
  });
});
