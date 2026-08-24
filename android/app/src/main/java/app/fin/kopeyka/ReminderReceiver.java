package app.fin.kopeyka;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String title = intent.getStringExtra("title");
        String message = intent.getStringExtra("message");
        boolean critical = intent.getBooleanExtra("critical", false);
        String id = intent.getStringExtra("id");
        if (title == null || title.isEmpty()) {
            title = critical ? "Важно · критическое" : "Финна";
        }
        FinBridge.postNotification(context, title, message, critical, id != null ? id : ("r" + System.currentTimeMillis()));
    }
}
