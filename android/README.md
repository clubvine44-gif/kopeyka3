# Фин — Android

Полноценное Android-приложение «Фин» с тем же функционалом, что и веб-Копейка:

- интерфейс и вся логика
- ИИ-агент (Groq)
- голос и wake-word «Привет, Фин / Финн / Фен»
- долги, расходы, резервы, облако

## Как собрать APK

1. Установи [Android Studio](https://developer.android.com/studio)
2. Открой папку `android` (или скачай репозиторий целиком)
3. Дождись Gradle Sync
4. **Build → Build APK(s)**
5. APK появится в `app/build/outputs/apk/debug/app-debug.apk`

Или из терминала:

```bash
cd android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

При первом запуске разреши **микрофон**.

Ключ Groq: в приложении ⚙ → Ключ Groq (хранится только на устройстве).
