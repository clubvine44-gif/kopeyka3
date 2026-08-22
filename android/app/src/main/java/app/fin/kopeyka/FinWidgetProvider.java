package app.fin.kopeyka;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class FinWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) updateOne(context, mgr, id);
    }

    static void updateOne(Context context, AppWidgetManager mgr, int id) {
        SharedPreferences p = context.getSharedPreferences("fin_widget", Context.MODE_PRIVATE);
        String daily = p.getString("daily", "—");
        String cash = p.getString("cash", "—");
        String available = p.getString("available", "—");
        String shift = p.getString("shift", "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_fin);
        views.setTextViewText(R.id.widget_daily, daily);
        views.setTextViewText(R.id.widget_cash, cash);
        views.setTextViewText(R.id.widget_available, available);
        views.setTextViewText(R.id.widget_shift, shift.isEmpty() ? "Сегодня" : ("Сегодня · " + shift));

        Intent open = new Intent(context, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
                context, 0, open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pi);

        mgr.updateAppWidget(id, views);
    }

    public static void refreshAll(Context context) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(context);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(context, FinWidgetProvider.class));
        if (ids == null || ids.length == 0) return;
        for (int id : ids) updateOne(context, mgr, id);
    }
}
