const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const { syncFormats } = require("../src/sync_formats");

describe("WhatsApp Sync Formats", function () {
  const testDir = "tests/data/test-sync";

  function createTestData() {
    // Create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Create media directories
    const mediaTypes = ["image", "document", "video", "audio"];
    mediaTypes.forEach((type) => {
      fs.mkdirSync(path.join(testDir, type), { recursive: true });
    });

    // Create native_backups directory
    const nativeBackupsDir = path.join(testDir, "native_backups");
    fs.mkdirSync(nativeBackupsDir, { recursive: true });

    // Create test JSON file
    const jsonData = [
      {
        messageId: "test1",
        messageTime: "2025-01-01 12:00:00",
        messageType: "chat",
        messageBody: "Hello from JSON!",
        formattedName: "Test User",
        phoneNum: "+1234567890",
        displayName: "Test User",
      },
      {
        messageId: "test2",
        messageTime: "2025-01-01 12:03:00",
        messageType: "image",
        messageBody: "sample.jpg",
        formattedName: "Test User",
        phoneNum: "+1234567890",
        displayName: "Test User",
      },
    ];

    fs.writeFileSync(
      path.join(testDir, "chats.json"),
      JSON.stringify(jsonData, null, 2)
    );

    // Create test native file with mixed date formats
    const nativeContent = `1/1/25, 12:01 - Test User: Hello from Native!
1/1/25, 12:02 - Test User: Another message from native
1/1/25, 12:04 - Test User: document.pdf (file attached)
[01.01.2025, 12:05:30] Test User: EU format message
01.01.2025, 12:06:15 Test User: EU no brackets message
1/1/25, 12:07 - Test User: Final message`;

    fs.writeFileSync(
      path.join(nativeBackupsDir, "WhatsApp Chat with +12 345 67 89 0.txt"),
      nativeContent
    );

    // Create a sample image file
    fs.writeFileSync(
      path.join(testDir, "image", "sample.jpg"),
      "fake image data"
    );

    return {
      jsonMessages: jsonData.length,
      nativeLines: nativeContent.split("\n").length,
    };
  }

  before(function () {
    this.testStats = createTestData();
    console.log(`    ✅ Test data created in: ${testDir}/`);
    console.log(`    📄 JSON messages: ${this.testStats.jsonMessages}`);
    console.log(`    📄 Native file created with multiple date formats`);
    console.log(`    📁 Media directories: image, document, video, audio`);
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
    it("should have created test directory", function () {
      expect(fs.existsSync(testDir)).to.be.true;
    });

    it("should have created JSON file", function () {
      const jsonPath = path.join(testDir, "chats.json");
      expect(fs.existsSync(jsonPath)).to.be.true;

      const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      expect(jsonData).to.be.an("array");
      expect(jsonData.length).to.equal(2);
    });

    it("should have created native file", function () {
      const nativePath = path.join(
        testDir,
        "native_backups",
        "WhatsApp Chat with +12 345 67 89 0.txt"
      );
      expect(fs.existsSync(nativePath)).to.be.true;

      const content = fs.readFileSync(nativePath, "utf8");
      expect(content).to.include("Hello from Native!");
      expect(content).to.include("EU format message");
    });

    it("should have created media directories", function () {
      const mediaTypes = ["image", "document", "video", "audio"];
      mediaTypes.forEach((type) => {
        const dirPath = path.join(testDir, type);
        expect(fs.existsSync(dirPath)).to.be.true;
      });
    });
  });

  describe("Synchronization process", function () {
    it("should run synchronization without errors", function () {
      const initialJsonSize = fs.statSync(
        path.join(testDir, "chats.json")
      ).size;

      expect(() => {
        syncFormats(testDir);
      }).to.not.throw();

      console.log(
        `    📊 Initial state: JSON: ${this.testStats.jsonMessages} messages`
      );

      // Check that files still exist after sync
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

    it("should have synchronized the files", function () {
      const jsonPath = path.join(testDir, "chats.json");
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

      expect(jsonData.length).to.be.greaterThan(2); // Should have more messages after sync
      console.log(`    📊 Final state: JSON: ${jsonData.length} messages`);
    });

    it("should preserve chronological order", function () {
      const jsonPath = path.join(testDir, "chats.json");
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

      // Check that messages are in chronological order
      for (let i = 1; i < jsonData.length; i++) {
        const prevTime = new Date(jsonData[i - 1].messageTime);
        const currTime = new Date(jsonData[i].messageTime);
        expect(currTime.getTime()).to.be.greaterThanOrEqual(prevTime.getTime());
      }
    });
  });

  describe("Sync function", function () {
    it("should be a valid function", function () {
      expect(syncFormats).to.be.a("function");
    });
  });
});
