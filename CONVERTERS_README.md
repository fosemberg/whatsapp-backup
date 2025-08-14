# WhatsApp Converters

Скрипты для конвертации между форматами WhatsApp:
- `json-to-native-converter.js` - Конвертация JSON → Native формат
- `native-to-json-converter.js` - Конвертация Native → JSON формат

## 🚀 Использование

### JSON в Native формат

```bash
node src/json-to-native-converter.js input.json output.txt [attachments_directory]
```

**Пример:**
```bash
node src/json-to-native-converter.js \
  data/input/2025/1234567890___Test-Chat/chats.json \
  output/chat.txt \
  output/attachments/
```

### Native в JSON формат

```bash
node src/native-to-json-converter.js input.txt output.json [attachments_directory]
```

**Пример:**
```bash
node src/native-to-json-converter.js \
  data/input/2025/1234567890___Test-Chat/native_backups/WhatsApp\ Chat\ with\ +12\ 345\ 67\ 89\ 0.txt \
  output/chat.json \
  output/attachments/
```

## 📁 Форматы данных

### JSON формат
```json
[
  {
    "country": "Test Country",
    "phoneNum": "+1234567890",
    "formattedName": "Test User",
    "displayName": "Test Display Name",
    "messageTime": "2025-02-28 18:50:57",
    "messageType": "chat",
    "messageBody": "Hello world!",
    "messageId": "false_1234567890@c.us_3AE89C28F3DDBCB49792"
  },
  {
    "country": "Test Country",
    "phoneNum": "+1234567890", 
    "formattedName": "Test User",
    "messageTime": "2025-02-28 19:00:00",
    "messageType": "image",
    "messageBody": "photo.jpg",
    "messageId": "false_1234567890@c.us_3BB4C39DA8E53A0B1EFD"
  }
]
```

### Native формат
```
2/28/25, 18:50 - Test User: Hello world!
2/28/25, 19:00 - Test User: photo.jpg (file attached)
```

## 🎯 Особенности

- **Автоматическое определение типов файлов** по расширению
- **Поддержка вложений**: изображения, видео, документы, аудио
- **Корректная обработка многострочных сообщений**
- **Создание уникальных ID сообщений**
- **Сохранение структуры директорий для медиафайлов**

## 📊 Поддерживаемые типы сообщений

- `chat` - Текстовые сообщения
- `image` - Изображения (.jpg, .jpeg, .png, .gif, .webp)
- `video` - Видео (.mp4, .avi, .mov, .mkv)
- `audio` - Аудио (.mp3, .wav, .ogg, .m4a)
- `document` - Документы (.pdf, .doc, .txt, и др.)

## 🧪 Тестирование

```bash
# Запуск основных тестов
node src/test-converters.js

# Тест структуры директорий
node src/test-directory-structure.js
```

Тесты создают тестовые данные и проверяют работу конвертеров в обоих направлениях.