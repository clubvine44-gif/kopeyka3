package app.fin.kopeyka;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** После перезагрузки и обновления APK заново ставит напоминания из сохранённого JSON. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String a = intent.getAction();
        if (a == null) return;
        if (Intent.ACTION_BOOT_COMPLETED.equals(a)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)
                || Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(a)) {
            try {
                FinBridge.rescheduleStored(context.getApplicationContext());
            } catch (Exception ignored) {}
        }
    }
}
