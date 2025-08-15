#!/usr/bin/env node

/**
 * Analyze specific duplicate message to understand why deduplication fails
 */

const fs = require("fs");
const path = require("path");

function analyzeDuplicate(chatDir, messageText) {
  console.log("=== Анализ конкретного дубликата ===\n");

  const jsonPath = path.join(chatDir, "chats.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ JSON file not found");
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  console.log(`📄 Анализируем ${data.length} сообщений...\n`);

  // Ищем сообщения с указанным текстом
  const matches = data.filter((msg, index) => {
    const body = (msg.messageBody || "").trim();
    return body.includes(messageText);
  });

  if (matches.length === 0) {
    console.log(`❌ Сообщения с текстом "${messageText}" не найдено`);
    return;
  }

  console.log(
    `🔍 Найдено ${matches.length} сообщений с текстом "${messageText}":\n`
  );

  matches.forEach((msg, i) => {
    console.log(`--- Сообщение ${i + 1} ---`);
    console.log(`messageBody: "${msg.messageBody}"`);
    console.log(`formattedName: "${msg.formattedName}"`);
    console.log(`messageTime: "${msg.messageTime}"`);
    console.log(`messageType: "${msg.messageType}"`);
    console.log(`messageId: "${msg.messageId}"`);
    console.log(`phoneNum: "${msg.phoneNum}"`);
    console.log(`country: "${msg.country}"`);
    if (msg.displayName) console.log(`displayName: "${msg.displayName}"`);

    // Создаем хеш для этого сообщения
    const normalizedBody = (msg.messageBody || "").trim();
    const normalizedSender =
      msg.formattedName === "You" ? "SELF" : msg.formattedName;
    const normalizedType = msg.messageType || "chat";
    const content = `${normalizedSender}:${normalizedType}:${normalizedBody}`;

    let hash = 0;
    for (let j = 0; j < content.length; j++) {
      const char = content.charCodeAt(j);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    console.log(`Хеш контента: "${content}" → ${hash.toString()}`);
    console.log("");
  });

  // Проверим, одинаковые ли хеши
  if (matches.length > 1) {
    const hashes = matches.map((msg) => {
      const normalizedBody = (msg.messageBody || "").trim();
      const normalizedSender =
        msg.formattedName === "You" ? "SELF" : msg.formattedName;
      const normalizedType = msg.messageType || "chat";
      const content = `${normalizedSender}:${normalizedType}:${normalizedBody}`;

      let hash = 0;
      for (let j = 0; j < content.length; j++) {
        const char = content.charCodeAt(j);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return hash.toString();
    });

    const uniqueHashes = new Set(hashes);
    console.log(`🎯 Результат анализа:`);
    console.log(`   Сообщений: ${matches.length}`);
    console.log(`   Уникальных хешей: ${uniqueHashes.size}`);
    console.log(`   Хеши: [${hashes.join(", ")}]`);

    if (uniqueHashes.size === 1) {
      console.log(`✅ Хеши одинаковые - дедупликация ДОЛЖНА работать!`);
    } else {
      console.log(`❌ Хеши разные - поэтому дедупликация НЕ работает!`);
      console.log(`   Нужно проверить алгоритм нормализации отправителей.`);
    }
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const chatDir = args[0] || "data/input/2025/1234567890___Test-Chat-Directory";
  const messageText = args[1] || "test@example.com"; // Анализируем простой дубликат
  analyzeDuplicate(chatDir, messageText);
}

module.exports = { analyzeDuplicate };
