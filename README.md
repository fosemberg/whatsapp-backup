# whatsapp-backup
## Запуск проекта:
- установка зависимостей  
```npm i```
- скопировать пример данных, в папку данных  
```npm run copy-input-example-to-data```
- собрать чаты в html и запустить в браузере  
```npm run start```
- Собрать pdf-ки. *пока запущены чаты в браузере  
```npm run build-pdfs```

## Примеры
- [Посмотреть примеры pdf](data/output.example/pdf)
- [Посмотреть примеры web](data/output.example/web)

## папка data. как собирались данные
- устанавливалось расширение google chrome:  
    Backup WhatsApp Chats  
    Version: 1.0.2  
    Updated: 6 January 2021  
    Size: 209KiB  
  https://chrome.google.com/webstore/detail/backup-whatsapp-chats/ibpjljmgmpnfbjbjdajbldfekkcnencp?hl=en-GB
- отрывалась web версия whatsapp:  
    https://web.whatsapp.com/
- просматривались все прикрепленные фотографии и видео, чтобы они скачались расширением, иначе расширение на загрузить фото, которые вы не открывали в клиенте
- открывалось расширение:  
    Backup WhatsApp Chats  
    \* диапазон больше года выбрать нельзя   
    параметры:
    - From: 01/01/2017
    - To: 01/01/2018
    - [*] Download media  

## TODO
- смержить историю по годам, чтобы можно было смотреть не по годам, а по людя
