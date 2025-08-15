const { expect } = require("chai");
const {
  createMessageHash,
  createTimeAwareHash,
  isMyMessage,
  resetConfigCache,
  loadConfig,
} = require("../src/sync_formats.js");
const path = require("path");

describe("Content-Based Message Deduplication", () => {
  before(() => {
    // Load test config for proper isMyMessage detection
    resetConfigCache();
    loadConfig(path.join(__dirname, "test-config.json"));
  });

  after(() => {
    resetConfigCache();
  });

  describe("Same message content from same person in different formats", () => {
    it("should generate identical hashes for same content despite different sender metadata", () => {
      // Same person represented differently in two formats
      const msg1 = {
        country: "Unknown",
        phoneNum: null,
        formattedName: "Contact Name",
        displayName: "Contact Name",
        messageTime: "2025-07-01 23:27:00",
        messageType: "chat",
        messageBody: "Test message that should be deduplicated",
        messageId: "false_sync@c.us_TEST1",
        timestamp: new Date("2025-07-01 23:27:00").getTime(),
      };

      const msg2 = {
        country: "TestCountry",
        phoneNum: "+12345678901",
        formattedName: "+12 345 67 89 01",
        displayName: "Contact Name",
        messageTime: "2025-07-01 23:27:22", // slightly different time
        messageType: "chat",
        messageBody: "Test message that should be deduplicated", // same content
        messageId: "false_12345678901@c.us_TEST2",
        timestamp: new Date("2025-07-01 23:27:22").getTime(),
      };

      const hash1 = createMessageHash(msg1);
      const hash2 = createMessageHash(msg2);

      console.log("📋 Testing content-based deduplication:");
      console.log(
        `   Message 1: ${msg1.formattedName} → "${msg1.messageBody}"`
      );
      console.log(
        `   Message 2: ${msg2.formattedName} → "${msg2.messageBody}"`
      );
      console.log(`   Hash 1: ${hash1}`);
      console.log(`   Hash 2: ${hash2}`);
      console.log(
        `   Both "OTHER" messages: ${!isMyMessage(msg1) && !isMyMessage(msg2)}`
      );

      // Should be identical because:
      // - Both are "OTHER" messages (not my messages)
      // - Same messageType and messageBody
      // - Time rounded to same minute
      expect(hash1).to.equal(
        hash2,
        "Messages with same content should have identical hashes regardless of sender metadata"
      );
    });

    it("should generate different hashes for different senders (SELF vs OTHER)", () => {
      const myMessage = {
        formattedName: "You",
        displayName: "You",
        messageTime: "2025-07-01 23:27:00",
        messageType: "chat",
        messageBody: "Same content",
        timestamp: new Date("2025-07-01 23:27:00").getTime(),
      };

      const otherMessage = {
        formattedName: "Contact Name",
        displayName: "Contact Name",
        messageTime: "2025-07-01 23:27:00",
        messageType: "chat",
        messageBody: "Same content",
        timestamp: new Date("2025-07-01 23:27:00").getTime(),
      };

      const myHash = createMessageHash(myMessage);
      const otherHash = createMessageHash(otherMessage);

      console.log("📋 Testing SELF vs OTHER distinction:");
      console.log(`   My message hash: ${myHash}`);
      console.log(`   Other message hash: ${otherHash}`);
      console.log(`   isMyMessage(myMessage): ${isMyMessage(myMessage)}`);
      console.log(`   isMyMessage(otherMessage): ${isMyMessage(otherMessage)}`);

      // Should be different because one is SELF, other is OTHER
      expect(myHash).to.not.equal(
        otherHash,
        "SELF and OTHER messages should have different hashes even with same content"
      );
    });

    it("should handle time-aware hashing with tolerance", () => {
      const msg1 = {
        formattedName: "Contact Name",
        messageTime: "2025-07-01 23:27:00",
        messageType: "chat",
        messageBody: "Test message",
        timestamp: new Date("2025-07-01 23:27:00").getTime(),
      };

      const msg2 = {
        formattedName: "+12 345 67 89 01", // Different metadata
        messageTime: "2025-07-01 23:28:30", // 1.5 minutes later
        messageType: "chat",
        messageBody: "Test message", // Same content
        timestamp: new Date("2025-07-01 23:28:30").getTime(),
      };

      const timeHash1 = createTimeAwareHash(msg1);
      const timeHash2 = createTimeAwareHash(msg2);

      console.log("📋 Testing time-aware deduplication:");
      console.log(`   Time 1: ${msg1.messageTime}`);
      console.log(`   Time 2: ${msg2.messageTime}`);
      console.log(`   Time hash 1: ${timeHash1}`);
      console.log(`   Time hash 2: ${timeHash2}`);

      // Should be the same because times are within 5-minute tolerance window
      expect(timeHash1).to.equal(
        timeHash2,
        "Messages within 5-minute window should have same time-aware hash"
      );
    });
  });

  describe("Hash function consistency", () => {
    it("should generate consistent hashes for identical messages", () => {
      const message = {
        formattedName: "Test User",
        messageTime: "2025-07-01 23:27:00",
        messageType: "chat",
        messageBody: "Consistent test message",
        timestamp: new Date("2025-07-01 23:27:00").getTime(),
      };

      const hash1 = createMessageHash(message);
      const hash2 = createMessageHash(message);
      const hash3 = createMessageHash(message);

      expect(hash1).to.equal(hash2);
      expect(hash2).to.equal(hash3);
      expect(hash1).to.be.a("string");
    });

    it("should generate different hashes for different content", () => {
      const baseMessage = {
        formattedName: "Test User",
        messageTime: "2025-07-01 23:27:00",
        messageType: "chat",
        timestamp: new Date("2025-07-01 23:27:00").getTime(),
      };

      const msg1 = { ...baseMessage, messageBody: "First message" };
      const msg2 = { ...baseMessage, messageBody: "Second message" };
      const msg3 = {
        ...baseMessage,
        messageType: "image",
        messageBody: "image.jpg",
      };

      const hash1 = createMessageHash(msg1);
      const hash2 = createMessageHash(msg2);
      const hash3 = createMessageHash(msg3);

      expect(hash1).to.not.equal(hash2);
      expect(hash2).to.not.equal(hash3);
      expect(hash1).to.not.equal(hash3);
    });
  });
});
