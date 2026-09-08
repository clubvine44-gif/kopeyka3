# Fin — keep the WebView JS bridge. Without this, R8 strips FinBridge
# methods and backups / reminders / widget updates silently stop.
-keep class app.fin.kopeyka.FinBridge { *; }
-keepclassmembers class app.fin.kopeyka.FinBridge {
    public *;
}
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class app.fin.kopeyka.** { *; }
-dontwarn app.fin.kopeyka.**
