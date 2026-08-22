package app.fin.kopeyka;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.webkit.JavascriptInterface;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

public class FinBridge {
    public static final String CHANNEL_ID = "fin_alerts_v3";
    private final Context context;

    public FinBridge(Context context) {
        this.context = context.getApplicationContext();
        ensureChannel();
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm == null) return;
        // remove silent legacy channels
        try { nm.deleteNotificationChannel("fin_reminders"); } catch (Exception ignored) {}
        try { nm.deleteNotificationChannel("fin_alerts_v2"); } catch (Exception ignored) {}

        NotificationChannel ch = nm.getNotificationChannel(CHANNEL_ID);
        if (ch == null) {
            ch = new NotificationChannel(CHANNEL_ID, "Уведомления Финн", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Напоминания и обновления");
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 180, 100, 180});
            Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes aa = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            ch.setSound(sound, aa);
            ch.setLockscreenVisibility(NotificationCompat.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(ch);
        }
    }

    @JavascriptInterface public String getVersion() {
        try { return context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionName; }
        catch (Exception e) { return ""; }
    }

    @JavascriptInterface public int getVersionCode() {
        try { return context.getPackageManager().getPackageInfo(context.getPackageName(), 0).versionCode; }
        catch (Exception e) { return 0; }
    }

    @JavascriptInterface public boolean isNative() { return true; }

    @JavascriptInterface
    public void showNotification(String title, String message) {
        ensureChannel();
        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(context, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);

        NotificationCompat.Builder b = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title != null && !title.isEmpty() ? title : "Финн")
                .setContentText(message != null ? message : "")
                .setStyle(new NotificationCompat.BigTextStyle().bigText(message != null ? message : ""))
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setSound(sound)
                .setVibrate(new long[]{0, 180, 100, 180})
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC);

        try {
            NotificationManagerCompat.from(context).notify(
                    (int) (System.currentTimeMillis() & 0xffff), b.build());
        } catch (SecurityException ignored) {}
    }

    @JavascriptInterface
    public void scheduleTestNotification() {
        Intent intent = new Intent(context, ReminderReceiver.class);
        intent.putExtra("title", "Финн");
        intent.putExtra("message", "Всё в порядке: уведомления работают. Можно не открывать приложение — важные напоминания придут сами.");
        PendingIntent pi = PendingIntent.getBroadcast(context, 99001, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        long at = System.currentTimeMillis() + 3000L;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M)
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        else
            am.set(AlarmManager.RTC_WAKEUP, at, pi);
    }

    @JavascriptInterface
    public void updateWidgetData(String daily, String cash, String shift) {
        updateWidgetDataFull(daily, cash, "—", shift, "");
    }

    @JavascriptInterface
    public void updateWidgetDataFull(String daily, String cash, String available, String shift, String left) {
        context.getSharedPreferences("fin_widget", Context.MODE_PRIVATE).edit()
                .putString("daily", daily != null ? daily : "—")
                .putString("cash", cash != null ? cash : "—")
                .putString("available", available != null ? available : "—")
                .putString("shift", shift != null ? shift : "")
                .putString("left", left != null ? left : "")
                .apply();
        FinWidgetProvider.refreshAll(context);
    }
}
