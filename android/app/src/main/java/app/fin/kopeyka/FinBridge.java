package app.fin.kopeyka;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import android.content.ContentValues;
import android.os.Environment;
import android.provider.MediaStore;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.lang.ref.WeakReference;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

public class FinBridge {
    public static final String CHANNEL_ID = "fin_alerts_v3";
    public static final String CHANNEL_CRITICAL = "fin_critical_v1";
    private static final String PREFS_REMINDERS = "fin_reminders";
    private final Context context;
    private final WeakReference<MainActivity> activityRef;
    private final AudioManager audioManager;
    private int savedSystemVolume = -1;
    private int savedNotificationVolume = -1;
    private boolean speechFeedbackMuted = false;

    public FinBridge(Context context) {
        this.context = context.getApplicationContext();
        this.activityRef = context instanceof MainActivity
                ? new WeakReference<>((MainActivity) context)
                : new WeakReference<>(null);
        this.audioManager = (AudioManager) this.context.getSystemService(Context.AUDIO_SERVICE);
        ensureChannel();
        scheduleFirstLaunchWelcome();
    }

    static void ensureChannels(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;
        try { nm.deleteNotificationChannel("fin_reminders"); } catch (Exception ignored) {}
        try { nm.deleteNotificationChannel("fin_alerts_v2"); } catch (Exception ignored) {}
        if (nm.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "Уведомления Финна", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Напоминания и обновления");
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 180, 100, 180});
            Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes aa = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
            ch.setSound(sound, aa);
            ch.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
        if (nm.getNotificationChannel(CHANNEL_CRITICAL) == null) {
            NotificationChannel crit = new NotificationChannel(CHANNEL_CRITICAL, "Важно · критическое", NotificationManager.IMPORTANCE_HIGH);
            crit.setDescription("Срочные резервы и критические платежи");
            crit.enableVibration(true);
            crit.setVibrationPattern(new long[]{0, 250, 120, 250, 120, 400});
            Uri alarm = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes aa2 = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
            crit.setSound(alarm, aa2);
            crit.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            crit.setShowBadge(true);
            nm.createNotificationChannel(crit);
        }
    }

    private void ensureChannel() {
        ensureChannels(context);
    }

    private void scheduleFirstLaunchWelcome() {
        final SharedPreferences p = context.getSharedPreferences("fin_first_launch", Context.MODE_PRIVATE);
        if (p.getBoolean("welcome_notification_shown", false)) return;
        new Handler(Looper.getMainLooper()).postDelayed(new Runnable() {
            private int attempts = 0;
            @Override public void run() {
                if (p.getBoolean("welcome_notification_shown", false)) return;
                attempts++;
                if (Build.VERSION.SDK_INT >= 33 && android.content.pm.PackageManager.PERMISSION_GRANTED != context.checkSelfPermission("android.permission.POST_NOTIFICATIONS")) {
                    if (attempts < 12) new Handler(Looper.getMainLooper()).postDelayed(this, 1500L);
                    return;
                }
                if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return;
                showNotification("Добро пожаловать в Финн", "Я Фина — твой ИИ-помощник. Давай вместе наведём порядок в твоих финансах.");
                p.edit().putBoolean("welcome_notification_shown", true).apply();
            }
        }, 6000L);
    }

    @JavascriptInterface
    public synchronized void silenceSpeechFeedback() {
        if (audioManager == null || speechFeedbackMuted) return;
        try {
            savedSystemVolume = audioManager.getStreamVolume(AudioManager.STREAM_SYSTEM);
            savedNotificationVolume = audioManager.getStreamVolume(AudioManager.STREAM_NOTIFICATION);
            int flags = AudioManager.FLAG_REMOVE_SOUND_AND_VIBRATE;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                audioManager.adjustStreamVolume(AudioManager.STREAM_SYSTEM, AudioManager.ADJUST_MUTE, flags);
                audioManager.adjustStreamVolume(AudioManager.STREAM_NOTIFICATION, AudioManager.ADJUST_MUTE, flags);
            } else {
                audioManager.setStreamVolume(AudioManager.STREAM_SYSTEM, 0, flags);
                audioManager.setStreamVolume(AudioManager.STREAM_NOTIFICATION, 0, flags);
            }
            speechFeedbackMuted = true;
        } catch (Exception ignored) { speechFeedbackMuted = false; }
    }

    @JavascriptInterface
    public synchronized void restoreSpeechFeedback() {
        if (audioManager == null || !speechFeedbackMuted) return;
        try {
            int flags = AudioManager.FLAG_REMOVE_SOUND_AND_VIBRATE;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                audioManager.adjustStreamVolume(AudioManager.STREAM_SYSTEM, AudioManager.ADJUST_UNMUTE, flags);
                audioManager.adjustStreamVolume(AudioManager.STREAM_NOTIFICATION, AudioManager.ADJUST_UNMUTE, flags);
            }
            if (savedSystemVolume >= 0) audioManager.setStreamVolume(AudioManager.STREAM_SYSTEM, savedSystemVolume, flags);
            if (savedNotificationVolume >= 0) audioManager.setStreamVolume(AudioManager.STREAM_NOTIFICATION, savedNotificationVolume, flags);
        } catch (Exception ignored) {
        } finally {
            speechFeedbackMuted = false;
            savedSystemVolume = -1;
            savedNotificationVolume = -1;
        }
    }

    @JavascriptInterface public String getVersion() { try { return context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionName; } catch (Exception e) { return ""; } }
    @JavascriptInterface public int getVersionCode() { try { return context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionCode; } catch (Exception e) { return 0; } }
    @JavascriptInterface public void setPullRefresh(boolean on) {
        MainActivity a = activityRef != null ? activityRef.get() : null;
        if (a != null) a.runOnUiThread(() -> a.setPullRefreshEnabled(on));
    }
    @JavascriptInterface public void checkUpdate() {
        MainActivity a = activityRef != null ? activityRef.get() : null;
        if (a != null) a.runOnUiThread(a::forceCheckUpdate);
    }
    @JavascriptInterface public void checkForUpdate() { checkUpdate(); }
    @JavascriptInterface public void requestMic() {
        try {
            MainActivity a = activityRef.get();
            if (a == null) return;
            a.runOnUiThread(() -> {
                try {
                    if (androidx.core.content.ContextCompat.checkSelfPermission(a, android.Manifest.permission.RECORD_AUDIO)
                            != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                        androidx.core.app.ActivityCompat.requestPermissions(
                                a, new String[]{android.Manifest.permission.RECORD_AUDIO}, 1001);
                    }
                } catch (Exception ignored) {}
            });
        } catch (Exception ignored) {}
    }
    @JavascriptInterface public boolean isNative() { return true; }

    @JavascriptInterface
    public void showNotification(String title, String message) {
        postNotification(context, title, message, false, "now_" + System.currentTimeMillis());
    }

    @JavascriptInterface
    public void showCriticalNotification(String title, String message) {
        postNotification(context, title, message, true, "crit_" + System.currentTimeMillis());
    }

    static void postNotification(Context context, String title, String message, boolean critical, String tag) {
        ensureChannels(context);
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int req = tag != null ? tag.hashCode() : (int) (System.currentTimeMillis() & 0xffff);
        PendingIntent pi = PendingIntent.getActivity(context, req, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        String channel = critical ? CHANNEL_CRITICAL : CHANNEL_ID;
        String t = title != null && !title.isEmpty() ? title : (critical ? "Важно · критическое" : "Финна");
        NotificationCompat.Builder b = new NotificationCompat.Builder(context, channel)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(t)
                .setContentText(message != null ? message : "")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message != null ? message : ""))
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setSound(sound)
                .setVibrate(critical ? new long[]{0, 250, 120, 250, 120, 400} : new long[]{0, 180, 100, 180})
                .setCategory(critical ? NotificationCompat.CATEGORY_ALARM : NotificationCompat.CATEGORY_REMINDER)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);
        if (critical) {
            b.setFullScreenIntent(pi, false);
        }
        try {
            NotificationManagerCompat.from(context).notify(req, b.build());
        } catch (SecurityException ignored) {}
    }

    @JavascriptInterface
    public void scheduleTestNotification() {
        SharedPreferences first = context.getSharedPreferences("fin_first_launch", Context.MODE_PRIVATE);
        if (!first.getBoolean("welcome_notification_shown", false)) {
            if (Build.VERSION.SDK_INT >= 33 && android.content.pm.PackageManager.PERMISSION_GRANTED != context.checkSelfPermission("android.permission.POST_NOTIFICATIONS")) return;
            if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return;
            showNotification("Добро пожаловать в Финн", "Я Фина — твой ИИ-помощник. Давай вместе наведём порядок в твоих финансах.");
            first.edit().putBoolean("welcome_notification_shown", true).apply();
            return;
        }
        Intent intent = new Intent(context, ReminderReceiver.class);
        intent.putExtra("title", "Важно · критическое");
        intent.putExtra("message", "Проверка: срочные уведомления работают, даже если приложение закрыто.");
        intent.putExtra("critical", true);
        PendingIntent pi = PendingIntent.getBroadcast(context, 99001, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        long at = System.currentTimeMillis() + 2500L;
        scheduleExact(am, at, pi);
    }

    @JavascriptInterface public void updateWidgetData(String daily, String cash, String shift) { updateWidgetDataFull(daily, cash, "—", shift, ""); }
    @JavascriptInterface public void updateWidgetDataFull(String daily, String cash, String available, String shift, String left) {
        context.getSharedPreferences("fin_widget", Context.MODE_PRIVATE).edit().putString("daily", daily != null ? daily : "—").putString("cash", cash != null ? cash : "—").putString("available", available != null ? available : "—").putString("shift", shift != null ? shift : "").putString("left", left != null ? left : "").apply();
        FinWidgetProvider.refreshAll(context);
    }

    @JavascriptInterface public void saveBackup(String json, String filename) {
        writeFinnaBackupFile(json, filename);
    }

    @JavascriptInterface public String getBackupFolderHint() {
        return "Загрузки / Finna";
    }

    /** Создаёт Загрузки/Finna + приватную копию и README. */
    @JavascriptInterface public void ensureBackupFolder() {
        try {
            File priv = context.getExternalFilesDir("FinnaBackup");
            if (priv == null) priv = new File(context.getFilesDir(), "FinnaBackup");
            if (!priv.exists()) priv.mkdirs();
        } catch (Exception ignored) {}
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // README через MediaStore один раз
                String readme = emergencyReadmeText();
                android.database.Cursor cur = context.getContentResolver().query(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        new String[]{MediaStore.Downloads._ID},
                        MediaStore.Downloads.DISPLAY_NAME + "=? AND " + MediaStore.Downloads.RELATIVE_PATH + " LIKE ?",
                        new String[]{"README-Finna.txt", "%/Finna/%"},
                        null);
                boolean exists = false;
                if (cur != null) {
                    exists = cur.moveToFirst();
                    cur.close();
                }
                if (!exists) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME, "README-Finna.txt");
                    cv.put(MediaStore.Downloads.MIME_TYPE, "text/plain");
                    cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Finna");
                    cv.put(MediaStore.Downloads.IS_PENDING, 1);
                    Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (uri != null) {
                        OutputStream out = context.getContentResolver().openOutputStream(uri);
                        if (out != null) {
                            out.write(readme.getBytes(StandardCharsets.UTF_8));
                            out.close();
                        }
                        cv.clear();
                        cv.put(MediaStore.Downloads.IS_PENDING, 0);
                        context.getContentResolver().update(uri, cv, null, null);
                    }
                }
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Finna");
                if (!dir.exists()) dir.mkdirs();
                File rf = new File(dir, "README-Finna.txt");
                if (!rf.exists()) {
                    FileOutputStream out = new FileOutputStream(rf);
                    out.write(emergencyReadmeText().getBytes(StandardCharsets.UTF_8));
                    out.close();
                }
            }
        } catch (Exception ignored) {}
    }

    private String emergencyReadmeText() {
        return "ПАПКА АВАРИЙНОГО ВОССТАНОВЛЕНИЯ ФИННЫ\n"
                + "=====================================\n\n"
                + "Сюда приложение само сохраняет полные копии всех данных.\n\n"
                + "Файлы:\n"
                + "  finna-latest.json  — самый свежий полный снимок (обновляется часто)\n"
                + "  finna-day-ГГГГ-ММ-ДД.json — снимок за день\n"
                + "  finna-month-ГГГГ-ММ.json — снимок на начало месяца\n\n"
                + "ВАЖНО: каждый JSON — это ПОЛНАЯ копия данных на момент сохранения\n"
                + "(доходы, расходы, долги, резервы, настройки, касса).\n"
                + "При восстановлении подставляется целиком этот снимок, а не «свалка» кусков.\n\n"
                + "После переустановки приложения Финна может подхватить finna-latest.json сама,\n"
                + "если локальные данные пустые. Также: Настройки → восстановить из файла / импорт JSON.\n\n"
                + "Не удаляйте эту папку, если хотите иметь запасной выход на полгода вперёд.\n";
    }

    /** Список JSON-бэкапов (приватная папка + Загрузки/Finna). JSON-массив строк. */
    @JavascriptInterface public String listBackupFiles() {
        org.json.JSONArray arr = new org.json.JSONArray();
        java.util.LinkedHashSet<String> seen = new java.util.LinkedHashSet<>();
        try {
            File priv = context.getExternalFilesDir("FinnaBackup");
            if (priv == null) priv = new File(context.getFilesDir(), "FinnaBackup");
            if (priv.exists()) {
                File[] files = priv.listFiles();
                if (files != null) {
                    java.util.Arrays.sort(files, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));
                    for (File f : files) {
                        if (f == null || !f.isFile()) continue;
                        String name = f.getName();
                        if (!name.toLowerCase().endsWith(".json")) continue;
                        if (!seen.add(name)) continue;
                        org.json.JSONObject o = new org.json.JSONObject();
                        o.put("name", name);
                        o.put("size", f.length());
                        o.put("modified", f.lastModified());
                        o.put("source", "private");
                        arr.put(o);
                    }
                }
            }
        } catch (Exception ignored) {}
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                android.database.Cursor cur = context.getContentResolver().query(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        new String[]{
                                MediaStore.Downloads.DISPLAY_NAME,
                                MediaStore.Downloads.SIZE,
                                MediaStore.Downloads.DATE_MODIFIED
                        },
                        MediaStore.Downloads.RELATIVE_PATH + " LIKE ? AND " + MediaStore.Downloads.DISPLAY_NAME + " LIKE ?",
                        new String[]{"%/Finna/%", "%.json"},
                        MediaStore.Downloads.DATE_MODIFIED + " DESC");
                if (cur != null) {
                    while (cur.moveToNext()) {
                        String name = cur.getString(0);
                        if (name == null || !seen.add(name)) continue;
                        org.json.JSONObject o = new org.json.JSONObject();
                        o.put("name", name);
                        o.put("size", cur.getLong(1));
                        o.put("modified", cur.getLong(2) * 1000L);
                        o.put("source", "downloads");
                        arr.put(o);
                    }
                    cur.close();
                }
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Finna");
                if (dir.exists()) {
                    File[] files = dir.listFiles();
                    if (files != null) {
                        java.util.Arrays.sort(files, (a, b) -> Long.compare(b.lastModified(), a.lastModified()));
                        for (File f : files) {
                            if (f == null || !f.isFile()) continue;
                            String name = f.getName();
                            if (!name.toLowerCase().endsWith(".json")) continue;
                            if (!seen.add(name)) continue;
                            org.json.JSONObject o = new org.json.JSONObject();
                            o.put("name", name);
                            o.put("size", f.length());
                            o.put("modified", f.lastModified());
                            o.put("source", "downloads");
                            arr.put(o);
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return arr.toString();
    }

    /** Читает JSON бэкапа по имени файла (сначала приватная папка, потом Загрузки/Finna). */
    @JavascriptInterface public String readBackupFile(String filename) {
        if (filename == null) return "";
        filename = filename.replace("\\", "/");
        int slash = filename.lastIndexOf('/');
        if (slash >= 0) filename = filename.substring(slash + 1);
        if (filename.isEmpty()) return "";
        // private
        try {
            File priv = context.getExternalFilesDir("FinnaBackup");
            if (priv == null) priv = new File(context.getFilesDir(), "FinnaBackup");
            File f = new File(priv, filename);
            if (f.exists() && f.isFile()) {
                byte[] b = new byte[(int) f.length()];
                java.io.FileInputStream in = new java.io.FileInputStream(f);
                int n = in.read(b);
                in.close();
                if (n > 0) return new String(b, 0, n, StandardCharsets.UTF_8);
            }
        } catch (Exception ignored) {}
        // public Downloads/Finna
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                android.database.Cursor cur = context.getContentResolver().query(
                        MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                        new String[]{MediaStore.Downloads._ID},
                        MediaStore.Downloads.DISPLAY_NAME + "=? AND " + MediaStore.Downloads.RELATIVE_PATH + " LIKE ?",
                        new String[]{filename, "%/Finna/%"},
                        null);
                if (cur != null) {
                    if (cur.moveToFirst()) {
                        long id = cur.getLong(0);
                        Uri uri = Uri.withAppendedPath(MediaStore.Downloads.EXTERNAL_CONTENT_URI, String.valueOf(id));
                        InputStream in = context.getContentResolver().openInputStream(uri);
                        if (in != null) {
                            java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
                            byte[] buf = new byte[8192];
                            int n;
                            while ((n = in.read(buf)) != -1) bos.write(buf, 0, n);
                            in.close();
                            cur.close();
                            return new String(bos.toByteArray(), StandardCharsets.UTF_8);
                        }
                    }
                    cur.close();
                }
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Finna");
                File f = new File(dir, filename);
                if (f.exists()) {
                    byte[] b = new byte[(int) f.length()];
                    java.io.FileInputStream in = new java.io.FileInputStream(f);
                    int n = in.read(b);
                    in.close();
                    if (n > 0) return new String(b, 0, n, StandardCharsets.UTF_8);
                }
            }
        } catch (Exception ignored) {}
        return "";
    }

    private void writeFinnaBackupFile(String json, String filename) {
        if (json == null) json = "";
        if (filename == null || filename.trim().isEmpty()) filename = "finna-latest.json";
        filename = filename.replace("\\", "/");
        int slash = filename.lastIndexOf('/');
        if (slash >= 0) filename = filename.substring(slash + 1);
        if (!filename.toLowerCase().endsWith(".json")) filename = filename + ".json";
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);

        try {
            File priv = context.getExternalFilesDir("FinnaBackup");
            if (priv == null) priv = new File(context.getFilesDir(), "FinnaBackup");
            if (!priv.exists()) priv.mkdirs();
            File pf = new File(priv, filename);
            FileOutputStream pos = new FileOutputStream(pf);
            pos.write(bytes);
            pos.close();
        } catch (Exception ignored) {}

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                if ("finna-latest.json".equalsIgnoreCase(filename)) {
                    try {
                        android.database.Cursor cur = context.getContentResolver().query(
                                MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                                new String[]{MediaStore.Downloads._ID},
                                MediaStore.Downloads.DISPLAY_NAME + "=? AND " + MediaStore.Downloads.RELATIVE_PATH + " LIKE ?",
                                new String[]{filename, "%/Finna/%"},
                                null);
                        if (cur != null) {
                            if (cur.moveToFirst()) {
                                long id = cur.getLong(0);
                                Uri exist = Uri.withAppendedPath(MediaStore.Downloads.EXTERNAL_CONTENT_URI, String.valueOf(id));
                                OutputStream uo = context.getContentResolver().openOutputStream(exist, "wt");
                                if (uo != null) {
                                    uo.write(bytes);
                                    uo.close();
                                    cur.close();
                                    return;
                                }
                            }
                            cur.close();
                        }
                    } catch (Exception ignored) {}
                }
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                cv.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Finna");
                cv.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) throw new IllegalStateException("insert failed");
                OutputStream out = context.getContentResolver().openOutputStream(uri);
                if (out == null) throw new IllegalStateException("no stream");
                out.write(bytes);
                out.close();
                cv.clear();
                cv.put(MediaStore.Downloads.IS_PENDING, 0);
                context.getContentResolver().update(uri, cv, null, null);
            } else {
                File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Finna");
                if (!dir.exists()) dir.mkdirs();
                File file = new File(dir, filename);
                FileOutputStream out = new FileOutputStream(file);
                out.write(bytes);
                out.close();
            }
        } catch (Exception e) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues cv = new ContentValues();
                    cv.put(MediaStore.Downloads.DISPLAY_NAME, "Finna-" + filename);
                    cv.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                    cv.put(MediaStore.Downloads.IS_PENDING, 1);
                    Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                    if (uri != null) {
                        OutputStream out = context.getContentResolver().openOutputStream(uri);
                        if (out != null) { out.write(bytes); out.close(); }
                        cv.clear(); cv.put(MediaStore.Downloads.IS_PENDING, 0);
                        context.getContentResolver().update(uri, cv, null, null);
                    }
                }
            } catch (Exception ignored) {}
        }
    }


    @JavascriptInterface public void scheduleReminders(String json) {
        applyReminders(context, json);
    }

    public static void rescheduleStored(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_REMINDERS, Context.MODE_PRIVATE);
        String json = prefs.getString("payload", "[]");
        applyReminders(context, json);
    }

    static void applyReminders(Context context, String json) {
        try {
            ensureChannels(context);
            JSONArray arr = new JSONArray(json == null ? "[]" : json);
            SharedPreferences prefs = context.getSharedPreferences(PREFS_REMINDERS, Context.MODE_PRIVATE);
            Set<String> oldIds = new HashSet<>(prefs.getStringSet("ids", Collections.<String>emptySet()));
            Set<String> newIds = new HashSet<>();
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            long now = System.currentTimeMillis();
            SharedPreferences fired = context.getSharedPreferences("fin_fired_notifs", Context.MODE_PRIVATE);

            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                String id = o.optString("id", "");
                if (id.isEmpty()) continue;
                String date = o.optString("date", "");
                String title = o.optString("title", "Финна");
                String message = o.optString("message", "");
                boolean critical = o.optBoolean("critical", false) || "critical".equalsIgnoreCase(o.optString("priority", ""));
                boolean immediate = o.optBoolean("immediate", false);
                long triggerAt = dateToMillisStatic(date);
                if (triggerAt <= 0 && !immediate) continue;
                newIds.add(id);
                int reqCode = id.hashCode();
                Intent intent = new Intent(context, ReminderReceiver.class);
                intent.putExtra("title", title);
                intent.putExtra("message", message);
                intent.putExtra("critical", critical);
                intent.putExtra("id", id);
                PendingIntent pi = PendingIntent.getBroadcast(context, reqCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

                boolean dueNow = immediate || (triggerAt > 0 && triggerAt <= now + 8000L);
                if (dueNow) {
                    String fireKey = "fired_" + id;
                    if (!fired.getBoolean(fireKey, false)) {
                        fired.edit().putBoolean(fireKey, true).apply();
                        postNotification(context, title, message, critical, id);
                    }
                    continue;
                }
                if (am != null) {
                    try { scheduleExact(am, triggerAt, pi); } catch (Exception ignored) {}
                }
            }
            for (String oldId : oldIds) {
                if (newIds.contains(oldId)) continue;
                int reqCode = oldId.hashCode();
                Intent intent = new Intent(context, ReminderReceiver.class);
                PendingIntent pi = PendingIntent.getBroadcast(context, reqCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                if (am != null) try { am.cancel(pi); } catch (Exception ignored) {}
            }
            prefs.edit().putStringSet("ids", newIds).putString("payload", arr.toString()).apply();
        } catch (Exception e) {
            android.util.Log.e("FinReminders", "schedule failed: " + e.getMessage(), e);
        }
    }

    private static void scheduleExact(AlarmManager am, long triggerAt, PendingIntent pi) {
        if (am == null || pi == null) return;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            }
        } catch (SecurityException se) {
            try { am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi); } catch (Exception ignored) {}
        }
    }

    static long dateToMillisStatic(String date) {
        try {
            String[] p = date.split("[-T:]", -1);
            if (p.length < 3) return 0;
            Calendar c = Calendar.getInstance();
            c.set(Calendar.YEAR, Integer.parseInt(p[0]));
            c.set(Calendar.MONTH, Integer.parseInt(p[1]) - 1);
            c.set(Calendar.DAY_OF_MONTH, Integer.parseInt(p[2]));
            int hh = p.length >= 4 ? Integer.parseInt(p[3]) : 9;
            int mm = p.length >= 5 ? Integer.parseInt(p[4]) : 0;
            c.set(Calendar.HOUR_OF_DAY, hh);
            c.set(Calendar.MINUTE, mm);
            c.set(Calendar.SECOND, 0);
            c.set(Calendar.MILLISECOND, 0);
            return c.getTimeInMillis();
        } catch (Exception e) { return 0; }
    }

    private long dateToMillis(String date) { return dateToMillisStatic(date); }
    private void postToast(String text){new Handler(Looper.getMainLooper()).post(()-> Toast.makeText(context,text,Toast.LENGTH_SHORT).show());}
}
