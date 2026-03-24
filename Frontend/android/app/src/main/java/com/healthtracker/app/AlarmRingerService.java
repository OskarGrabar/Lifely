package com.healthtracker.app;

import android.app.Notification;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import androidx.core.app.NotificationCompat;

/**
 * Foreground service that keeps the alarm ringing (vibration + notification)
 * until the user dismisses or snoozes it.
 *
 * Running as a foreground service means Android cannot kill the vibration due
 * to background process limits — this is the same approach used by Samsung/Google Clock.
 */
public class AlarmRingerService extends Service {

    static final String ACTION_START = "com.healthtracker.app.RINGER_START";
    static final String ACTION_STOP  = "com.healthtracker.app.RINGER_STOP";

    /** Live instance — set on start, cleared on destroy. */
    static AlarmRingerService instance;

    // ── service entry point ───────────────────────────────────────────────────

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) { stopSelf(); return START_NOT_STICKY; }

        if (ACTION_STOP.equals(intent.getAction())) {
            doStop(intent.getIntExtra("id", -1));
            return START_NOT_STICKY;
        }

        // ACTION_START — ring the alarm
        instance = this;
        int    id    = intent.getIntExtra("id", 0);
        String title = intent.getStringExtra("title");
        String time  = intent.getStringExtra("time");
        if (title == null) title = "⏰ Alarm";
        if (time  == null) time  = "";

        // Notification ID must be non-zero — use id, or fall back to 9999
        final int notifId = id != 0 ? id : 9999;

        // Create channel BEFORE building any notification
        AlarmReceiver.createChannel(this);

        // Full-screen intent — opens / wakes MainActivity
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP
                | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        mainIntent.putExtra("ALARM_FIRING", true);
        mainIntent.putExtra("ALARM_ID",     id);
        mainIntent.putExtra("ALARM_TITLE",  title);
        PendingIntent fullScreenPI = PendingIntent.getActivity(
                this, notifId, mainIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Dismiss action
        Intent dismissIntent = new Intent(this, AlarmActionReceiver.class);
        dismissIntent.setAction(AlarmReceiver.ACTION_DISMISS);
        dismissIntent.putExtra("id", id);
        PendingIntent dismissPI = PendingIntent.getBroadcast(
                this, notifId * 10 + 1, dismissIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Snooze action
        Intent snoozeIntent = new Intent(this, AlarmActionReceiver.class);
        snoozeIntent.setAction(AlarmReceiver.ACTION_SNOOZE);
        snoozeIntent.putExtra("id",    id);
        snoozeIntent.putExtra("title", title);
        snoozeIntent.putExtra("time",  time);
        PendingIntent snoozePI = PendingIntent.getBroadcast(
                this, notifId * 10 + 2, snoozeIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        Notification notification = new NotificationCompat.Builder(this, AlarmReceiver.CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
                .setContentTitle(title)
                .setContentText("It's " + time)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setFullScreenIntent(fullScreenPI, true)
                .setContentIntent(fullScreenPI)
                .setOngoing(true)
                .setAutoCancel(false)
                .addAction(0, "✕ Dismiss", dismissPI)
                .addAction(0, "💤 Snooze 5 min", snoozePI)
                .build();

        // startForeground MUST be called quickly — do it before vibration
        startForeground(notifId, notification);

        startVibration();

        return START_NOT_STICKY;
    }

    // ── vibration ─────────────────────────────────────────────────────────────

    private void startVibration() {
        // {delay, on, off} — repeat=1 loops on/off forever, ignoring the leading delay
        long[] pattern = {0, 800, 400};
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm =
                    (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            if (vm != null)
                vm.getDefaultVibrator().vibrate(VibrationEffect.createWaveform(pattern, 1));
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) v.vibrate(VibrationEffect.createWaveform(pattern, 1));
        } else {
            @SuppressWarnings("deprecation")
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) v.vibrate(pattern, 1);
        }
    }

    private void stopVibration() {
        stopVibration(this);
    }

    /** Static helper so AlarmPlugin / AlarmActionReceiver can call it too. */
    static void stopVibration(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm =
                    (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            if (vm != null) vm.cancel();
        } else {
            Vibrator v = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) v.cancel();
        }
    }

    // ── stop / clean up ───────────────────────────────────────────────────────

    private void doStop(int id) {
        stopVibration();
        final int notifId = id >= 0 ? (id != 0 ? id : 9999) : -1;
        if (notifId > 0) {
            android.app.NotificationManager nm =
                    (android.app.NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(notifId);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            //noinspection deprecation
            stopForeground(true);
        }
        stopSelf();
    }

    /** Convenience: stop the service from any context. */
    static void stopService(Context context, int id) {
        Intent intent = new Intent(context, AlarmRingerService.class);
        intent.setAction(ACTION_STOP);
        intent.putExtra("id", id);
        context.startService(intent);
        // Belt-and-suspenders: cancel vibration even if service isn't running
        stopVibration(context);
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onDestroy() {
        stopVibration();
        instance = null;
        super.onDestroy();
    }
}
