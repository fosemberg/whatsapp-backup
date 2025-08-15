#!/usr/bin/env node

/**
 * Find duplicate messages in chats.json
 */

const fs = require("fs");
const path = require("path");

function findDuplicates(chatDir) {
  console.log("=== Поиск дубликатов ===\n");

  const jsonPath = path.join(chatDir, "chats.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ JSON file not found");
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  console.log(`📄 Анализируем ${data.length} сообщений...\n`);

  // Группируем по messageBody
  const messageGroups = new Map();

  data.forEach((msg, index) => {
    const body = (msg.messageBody || "").trim();
    if (body.length < 5) return; // Пропускаем короткие сообщения

    if (!messageGroups.has(body)) {
      messageGroups.set(body, []);
    }
    messageGroups.get(body).push({
      index,
      sender: msg.formattedName || msg.phoneNum,
      time: msg.messageTime,
      type: msg.messageType,
      body: body.substring(0, 50) + (body.length > 50 ? "..." : ""),
    });
  });

  // Ищем дубликаты
  const duplicates = [];
  for (const [body, messages] of messageGroups) {
    if (messages.length > 1) {
      duplicates.push({ body, messages });
    }
  }

  console.log(`🔍 Найдено ${duplicates.length} групп дубликатов:\n`);

  duplicates.slice(0, 10).forEach((dup, i) => {
    console.log(`${i + 1}. "${dup.body}" (${dup.messages.length} раз):`);
    dup.messages.forEach((msg, j) => {
      console.log(`   ${j + 1}. [${msg.index}] ${msg.sender} (${msg.time})`);
    });
    console.log("");
  });

  if (duplicates.length > 10) {
    console.log(`... и еще ${duplicates.length - 10} групп дубликатов\n`);
  }

  // Ищем конкретное сообщение
  const targetMessage = duplicates.find(
    (dup) =>
      dup.body.toLowerCase().includes("prefer") &&
      dup.body.toLowerCase().includes("live") &&
      dup.body.toLowerCase().includes("alone")
  );

  if (targetMessage) {
    console.log(`🎯 Найдено целевое сообщение:`);
    console.log(`   "${targetMessage.body}"`);
    console.log(`   Повторений: ${targetMessage.messages.length}`);
    targetMessage.messages.forEach((msg, j) => {
      console.log(
        `   ${j + 1}. [${msg.index}] ${msg.sender} (${msg.time}) [${msg.type}]`
      );
    });
  } else {
    console.log("❌ Сообщение 'prefer live alone' не найдено в дубликатах");
  }

  return duplicates;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const chatDir = args[0] || "data/input/2025/1234567890___Test-Chat-Directory";
  findDuplicates(chatDir);
}

module.exports = { findDuplicates };
