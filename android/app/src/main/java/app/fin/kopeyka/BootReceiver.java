package app.fin.kopeyka;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** После перезагрузки и обновления APK заново ставит напоминания и проверку автообновления. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String a = intent.getAction();
        if (a == null) return;
        boolean boot = Intent.ACTION_BOOT_COMPLETED.equals(a)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)
                || Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(a)
                || "android.intent.action.QUICKBOOT_POWERON".equals(a)
                || "com.htc.intent.action.QUICKBOOT_POWERON".equals(a);
        if (!boot) return;
        try {
            FinBridge.rescheduleStored(context.getApplicationContext());
        } catch (Exception ignored) {}
        try {
            UpdateCheckReceiver.scheduleSoon(context.getApplicationContext());
        } catch (Exception ignored) {}
    }
}
