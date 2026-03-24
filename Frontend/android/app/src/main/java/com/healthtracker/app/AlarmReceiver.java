package com.healthtracker.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {

    static final String CHANNEL_ID     = "health_alarm_hw";
    static final String ACTION_DISMISS = "com.healthtracker.app.ALARM_DISMISS";
    static final String ACTION_SNOOZE  = "com.healthtracker.app.ALARM_SNOOZE";

    @Override
    public void onReceive(Context context, Intent intent) {
        int    id             = intent.getIntExtra("id", 0);
        String title          = intent.getStringExtra("title");
        String time           = intent.getStringExtra("time");
        long   repeatMs = intent.getLongExtra("repeatMs", 0L);
        if (title == null) title = "⏰ Alarm";
        if (time  == null) time  = "";

        // 1. Tell the Capacitor plugin (fires JS event if app is alive)
        AlarmPlugin.notifyFired(context, id, title);

        // 2. Start vibration immediately from the receiver so the user feels it at once.
        //    The foreground service will take over and keep it going indefinitely.
        startVibration(context);

        // 3. Start foreground service — owns the notification and sustains vibration
        Intent ringerIntent = new Intent(context, AlarmRingerService.class);
        ringerIntent.setAction(AlarmRingerService.ACTION_START);
        ringerIntent.putExtra("id",    id);
        ringerIntent.putExtra("title", title);
        ringerIntent.putExtra("time",  time);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(ringerIntent);
        } else {
            context.startService(ringerIntent);
        }

        // 4. Reschedule if repeating
        if (repeatMs > 0) {
            scheduleNext(context, id, title, time, System.currentTimeMillis() + repeatMs, repeatMs);
        }
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    static void createChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Health Alarms", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Alarm notifications");
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 800, 400, 800, 400, 800, 400, 800});
            ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            ch.setBypassDnd(true);
            NotificationManager nm = context.getSystemService(NotificationManager.class);
            nm.createNotificationChannel(ch);
        }
    }

    // Called immediately on receipt so the user feels the alarm at once;
    // AlarmRingerService takes over and loops it indefinitely.
    static void startVibration(Context context) {
        long[] pattern = {0, 800, 400, 800, 400, 800, 400, 800, 400, 800, 400, 800};
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm =
                    (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            if (vm != null)
                vm.getDefaultVibrator()
                        .vibrate(VibrationEffect.createWaveform(pattern, 0));
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) v.vibrate(VibrationEffect.createWaveform(pattern, 0));
        } else {
            @SuppressWarnings("deprecation")
            Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) v.vibrate(pattern, 0);
        }
    }

    private void scheduleNext(Context context, int id, String title, String time,
                              long fireAt, long repeatMs) {
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra("id",       id);
        intent.putExtra("title",    title);
        intent.putExtra("time",     time);
        intent.putExtra("repeatMs", repeatMs);
        PendingIntent pi = PendingIntent.getBroadcast(
                context, id, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pi);
        } else {
            am.setExact(AlarmManager.RTC_WAKEUP, fireAt, pi);
        }
    }
}
