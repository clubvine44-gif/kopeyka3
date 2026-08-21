package app.fin.kopeyka;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Calendar;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/** Мост JS ⇄ Android: экспорт бэкапа данных и напоминания о датах платежей. */
public class FinBridge {

    private static final String PREFS = "fin_reminders";
    private static final String KEY_IDS = "ids";

    private final Context context;

    public FinBridge(Context context) {
        this.context = context.getApplicationContext();
    }

    @JavascriptInterface
    public void saveBackup(String json, String filename) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues cv = new ContentValues();
                cv.put(MediaStore.Downloads.DISPLAY_NAME, filename);
                cv.put(MediaStore.Downloads.MIME_TYPE, "application/json");
                cv.put(MediaStore.Downloads.IS_PENDING, 1);
                Uri uri = context.getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                if (uri == null) throw new IllegalStateException("не удалось создать файл");
                OutputStream out = context.getContentResolver().openOutputStream(uri);
                if (out == null) throw new IllegalStateException("нет доступа к файлу");
                out.write(json.getBytes(StandardCharsets.UTF_8));
                out.close();
                cv.clear();
                cv.put(MediaStore.Downloads.IS_PENDING, 0);
                context.getContentResolver().update(uri, cv, null, null);
            } else {
                File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!dir.exists()) dir.mkdirs();
                File file = new File(dir, filename);
                FileOutputStream out = new FileOutputStream(file);
                out.write(json.getBytes(StandardCharsets.UTF_8));
                out.close();
            }
            postToast("Сохранено в Загрузки: " + filename);
        } catch (Exception e) {
            postToast("Не удалось сохранить бэкап: " + e.getMessage());
        }
    }

    @JavascriptInterface
    public void scheduleReminders(String json) {
        try {
            JSONArray arr = new JSONArray(json);
            SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            Set<String> oldIds = new HashSet<>(prefs.getStringSet(KEY_IDS, Collections.<String>emptySet()));
            Set<String> newIds = new HashSet<>();
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                String id = o.optString("id", "");
                if (id.isEmpty()) continue;
                String date = o.optString("date", "");
                String title = o.optString("title", "Копейка");
                String message = o.optString("message", "");
                long triggerAt = dateToMillis(date);
                if (triggerAt <= 0) continue;
                newIds.add(id);
                int reqCode = id.hashCode();
                Intent intent = new Intent(context, ReminderReceiver.class);
                intent.putExtra("title", title);
                intent.putExtra("message", message);
                PendingIntent pi = PendingIntent.getBroadcast(context, reqCode, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                try {
                    if (am != null) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
                } catch (Exception ignored) { }
            }

            for (String oldId : oldIds) {
                if (newIds.contains(oldId)) continue;
                int reqCode = oldId.hashCode();
                Intent intent = new Intent(context, ReminderReceiver.class);
                PendingIntent pi = PendingIntent.getBroadcast(context, reqCode, intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                if (am != null) am.cancel(pi);
            }

            prefs.edit().putStringSet(KEY_IDS, newIds).apply();
        } catch (Exception ignored) { }
    }

    /** Дата "yyyy-MM-dd" -> миллисекунды на 10:00 местного времени. */
    private long dateToMillis(String isoDate) {
        try {
            String[] p = isoDate.split("-");
            Calendar c = Calendar.getInstance();
            c.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]), 10, 0, 0);
            c.set(Calendar.MILLISECOND, 0);
            return c.getTimeInMillis();
        } catch (Exception e) {
            return -1;
        }
    }

    private void postToast(final String msg) {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override public void run() {
                Toast.makeText(context, msg, Toast.LENGTH_LONG).show();
            }
        });
    }
}
