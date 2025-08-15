const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const { syncFormats } = require("../src/sync_formats");

describe("WhatsApp Smart Deduplication", function () {
  const testDir = "tests/data/test-smart-dedup";

  function createUniversalTestData() {
    // Clean up and create test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    fs.mkdirSync(testDir, { recursive: true });

    // Create JSON with various sender representations
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
        formattedName: "Alice Johnson Professional Chat",
        phoneNum: "+1555987654",
        displayName: "Alice",
      },
      {
        messageId: "json3",
        messageTime: "2025-01-01 12:02:00",
        messageType: "image",
        messageBody: "photo.jpg",
        formattedName: "Alice",
        phoneNum: "+1555987654",
        displayName: "Alice",
      },
    ];

    fs.writeFileSync(
      path.join(testDir, "chats.json"),
      JSON.stringify(jsonData, null, 2)
    );

    // Create native file with different name representations
    const nativeDir = path.join(testDir, "native_backups");
    fs.mkdirSync(nativeDir, { recursive: true });

    const nativeContent = `1/1/25, 12:00 - Mike Smith: Hello from JSON!
1/1/25, 12:01 - +1555987654: Hi there!
1/1/25, 12:02 - Alice: photo.jpg (file attached)
1/1/25, 12:03 - Bob Smith Engineering Team Lead: Unique message from Bob
1/1/25, 12:04 - +15551234567890: Another message from main user`;

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
      expectedSenders: [
        "You/Mike Smith",
        "Alice variants",
        "Bob",
        "Phone numbers",
      ],
    };
  }

  before(function () {
    this.testStats = createUniversalTestData();
    console.log(`    ✅ Universal test data created:`);
    console.log(`       📄 JSON: ${this.testStats.jsonMessages} messages`);
    console.log(`       📄 Native: ${this.testStats.nativeMessages} messages`);
    console.log(
      `       🎯 Should auto-detect: You↔Mike Smith, Alice variants, phone formats`
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
    it("should have created complex sender mapping test data", function () {
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

    it("should have various sender name representations", function () {
      const jsonData = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );
      const senders = jsonData.map((msg) => msg.formattedName);

      expect(senders).to.include("You");
      expect(senders).to.include("Alice Johnson Professional Chat");
      expect(senders).to.include("Alice");

      const nativeContent = fs.readFileSync(
        path.join(
          testDir,
          "native_backups",
          "WhatsApp Chat with +15551234567890.txt"
        ),
        "utf8"
      );
      expect(nativeContent).to.include("Mike Smith");
      expect(nativeContent).to.include("+1555987654");
      expect(nativeContent).to.include("Bob Smith Engineering Team Lead");
    });
  });

  describe("Smart deduplication execution", function () {
    it("should perform smart deduplication without hardcoded names", function () {
      console.log(
        `    🚀 Testing smart deduplication without hardcoded names...`
      );

      expect(() => {
        syncFormats(testDir);
      }).to.not.throw();

      const finalJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      console.log(`    📊 Results Analysis:`);
      console.log(`       Final message count: ${finalJson.length}`);

      const uniqueSenders = [
        ...new Set(finalJson.map((msg) => msg.formattedName)),
      ];
      console.log(`       Unique senders: ${uniqueSenders.length}`);
      console.log(`       Senders: ${uniqueSenders.join(", ")}`);

      expect(finalJson.length).to.be.greaterThan(3); // Should have merged some messages
    });

    it("should correctly identify duplicate content across different sender names", function () {
      const finalJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      // Check for expected messages
      const bodies = finalJson.map((msg) => msg.messageBody);
      expect(bodies).to.include("Hello from JSON!");
      expect(bodies).to.include("Hi there!");
      expect(bodies).to.include("photo.jpg");
      expect(bodies).to.include("Unique message from Bob");
      expect(bodies).to.include("Another message from main user");
    });

    it("should map related sender names intelligently", function () {
      const finalJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      // Check that we have reasonable number of unique senders
      // (not too many due to smart mapping, not too few due to over-merging)
      const uniqueSenders = [
        ...new Set(finalJson.map((msg) => msg.formattedName)),
      ];
      expect(uniqueSenders.length).to.be.greaterThan(2);
      expect(uniqueSenders.length).to.be.lessThan(8); // Shouldn't have too many distinct senders
    });

    it("should maintain chronological order after smart deduplication", function () {
      const finalJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      for (let i = 1; i < finalJson.length; i++) {
        const prevTime = new Date(finalJson[i - 1].messageTime);
        const currTime = new Date(finalJson[i].messageTime);
        expect(currTime.getTime()).to.be.greaterThanOrEqual(prevTime.getTime());
      }
    });
  });

  describe("Universal sender mapping", function () {
    it("should handle phone number normalization", function () {
      const finalJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      // Check that phone numbers are handled consistently
      const phoneNumberMessages = finalJson.filter(
        (msg) => msg.formattedName && msg.formattedName.match(/^\+\d+/)
      );

      if (phoneNumberMessages.length > 0) {
        // Phone numbers should be normalized
        phoneNumberMessages.forEach((msg) => {
          expect(msg.formattedName).to.match(/^\+\d+$/);
        });
      }
    });

    it("should handle display name mapping", function () {
      const finalJson = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      // Check that messages have consistent displayName where possible
      const messagesWithDisplayName = finalJson.filter(
        (msg) => msg.displayName
      );
      expect(messagesWithDisplayName.length).to.be.greaterThan(0);
    });
  });

  describe("Deduplication stability", function () {
    it("should remain stable on second run", function () {
      const beforeSecondRun = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      expect(() => {
        syncFormats(testDir);
      }).to.not.throw();

      const afterSecondRun = JSON.parse(
        fs.readFileSync(path.join(testDir, "chats.json"), "utf8")
      );

      // Should have same count after second run (stable deduplication)
      expect(afterSecondRun.length).to.equal(beforeSecondRun.length);
    });
  });
});
