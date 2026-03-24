package com.healthtracker.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

public class AlarmActionReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        int    id     = intent.getIntExtra("id", 0);
        String action = intent.getAction();

        // Stop the foreground ringer service (cancels vibration + notification in one shot)
        AlarmRingerService.stopService(context, id);

        // Clear firing state from SharedPreferences
        SharedPreferences prefs =
                context.getSharedPreferences(AlarmPlugin.PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(AlarmPlugin.FIRING_KEY).apply();

        // Notify JS overlay to close
        AlarmPlugin.notifyDismissed(id);

        // Handle snooze: reschedule in 5 minutes
        if (AlarmReceiver.ACTION_SNOOZE.equals(action)) {
            String title = intent.getStringExtra("title");
            String time  = intent.getStringExtra("time");
            if (title == null) title = "⏰ Alarm";
            if (time  == null) time  = "";

            long snoozeAt = System.currentTimeMillis() + 5 * 60 * 1000L;
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent snoozeIntent = new Intent(context, AlarmReceiver.class);
            snoozeIntent.putExtra("id",       id + 9000);
            snoozeIntent.putExtra("title",    "⏰ (Snoozed) " + title.replace("⏰ ", ""));
            snoozeIntent.putExtra("time",     time);
            snoozeIntent.putExtra("repeatMs", 0L);
            PendingIntent pi = PendingIntent.getBroadcast(
                    context, id + 9000, snoozeIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, snoozeAt, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, snoozeAt, pi);
            }
        }
    }
}
