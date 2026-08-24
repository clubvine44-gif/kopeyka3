package app.fin.kopeyka;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.ActivityCompat;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** Фоновая проверка update.json — пуш, если вышла новая версия (даже когда приложение закрыто). */
public class UpdateCheckReceiver extends BroadcastReceiver {

    private static final String UPDATE_URL = "https://raw.githubusercontent.com/clubvine44-gif/kopeyka3/main/update.json";
    private static final String PREFS = "fin_update";
    private static final long INTERVAL_MS = 6L * 60L * 60L * 1000L; // 6 часов

    @Override
    public void onReceive(Context context, Intent intent) {
        // колбэк PackageInstaller — не запускаем проверку обновлений
        if (intent != null && "app.fin.kopeyka.INSTALL_STATUS".equals(intent.getAction())) {
            return;
        }
        final PendingResult pr = goAsync();
        new Thread(() -> {
            try {
                check(context);
            } catch (Exception ignored) {
            } finally {
                scheduleNext(context);
                pr.finish();
            }
        }).start();
    }

    static void scheduleNext(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent i = new Intent(context, UpdateCheckReceiver.class);
        PendingIntent pi = PendingIntent.getBroadcast(context, 77001, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        long at = System.currentTimeMillis() + INTERVAL_MS;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } else {
            am.set(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    static void scheduleSoon(Context context) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent i = new Intent(context, UpdateCheckReceiver.class);
        PendingIntent pi = PendingIntent.getBroadcast(context, 77001, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        long at = System.currentTimeMillis() + 15_000L;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } else {
            am.set(AlarmManager.RTC_WAKEUP, at, pi);
        }
    }

    private void check(Context context) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(UPDATE_URL).openConnection();
        c.setConnectTimeout(12000);
        c.setReadTimeout(12000);
        c.setUseCaches(false);
        c.setRequestProperty("Cache-Control", "no-cache");
        if (c.getResponseCode() != 200) return;
        InputStream in = c.getInputStream();
        StringBuilder sb = new StringBuilder();
        byte[] buf = new byte[4096];
        int n;
        while ((n = in.read(buf)) != -1) sb.append(new String(buf, 0, n, "UTF-8"));
        in.close();
        c.disconnect();

        JSONObject j = new JSONObject(sb.toString());
        int remote = j.optInt("versionCode", 0);
        String name = j.optString("versionName", "");
        int local = context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionCode;
        if (remote <= local) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int notified = prefs.getInt("notified_code", 0);
        if (notified == remote) return;
        prefs.edit().putInt("notified_code", remote).apply();

        String msg = "Доступна версия " + (name.isEmpty() ? String.valueOf(remote) : name)
                + ". Открой приложение, чтобы обновить.";
        notifyUpdate(context, msg);
    }

    private void notifyUpdate(Context context, String message) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        String channelId = FinBridge.CHANNEL_ID;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = nm.getNotificationChannel(channelId);
            if (channel == null) {
                channel = new NotificationChannel(channelId, "Уведомления Финн", NotificationManager.IMPORTANCE_HIGH);
                Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
                AudioAttributes aa = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                channel.setSound(sound, aa);
                nm.createNotificationChannel(channel);
            }
        }
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder b = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("Обновление Финн")
                .setContentText(message)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message))
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setSound(sound)
                .setDefaults(NotificationCompat.DEFAULT_ALL);

        boolean can = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                || ActivityCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED;
        if (can) nm.notify(77002, b.build());
    }
}
