package com.healthtracker.app;

import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmPlugin")
public class AlarmPlugin extends Plugin {

    public static AlarmPlugin instance;
    static final String PREFS_NAME  = "HealthAlarms";
    static final String FIRING_KEY  = "alarm_firing";

    @Override
    public void load() {
        instance = this;
        // If a firing alarm was stored (app was killed), fire the event now
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String json = prefs.getString(FIRING_KEY, null);
        if (json != null) {
            try {
                JSObject data = new JSObject(json);
                notifyListeners("alarmFired", data, true);
            } catch (Exception ignored) {}
        }
    }

    // Called by MainActivity.onNewIntent when the full-screen intent opens the app
    public void onAlarmIntent(Intent intent) {
        if (intent == null || !intent.getBooleanExtra("ALARM_FIRING", false)) return;
        JSObject data = new JSObject();
        data.put("notificationId", intent.getIntExtra("ALARM_ID", 0));
        data.put("title", intent.getStringExtra("ALARM_TITLE"));
        notifyListeners("alarmFired", data, true);
    }

    // ── checkAlarmPermissions — returns current grant status ─────────────────
    @PluginMethod
    public void checkAlarmPermissions(PluginCall call) {
        Context ctx = getContext();

        boolean hasNotifications = true; // default true for < API 33
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            hasNotifications = ContextCompat.checkSelfPermission(
                    ctx, android.Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }

        boolean canExactAlarm = true; // default true for < API 31
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
            canExactAlarm = am != null && am.canScheduleExactAlarms();
        }

        boolean canFullScreen = true; // default true for < API 34
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            NotificationManager nm =
                    (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
            canFullScreen = nm != null && nm.canUseFullScreenIntent();
        }

        JSObject result = new JSObject();
        result.put("hasNotifications", hasNotifications);
        result.put("canExactAlarm",    canExactAlarm);
        result.put("canFullScreen",    canFullScreen);
        call.resolve(result);
    }

    // ── requestAlarmPermissions — requests POST_NOTIFICATIONS inline dialog ──
    @PluginMethod
    public void requestAlarmPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(getContext(),
                    android.Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                        getActivity(),
                        new String[]{ android.Manifest.permission.POST_NOTIFICATIONS },
                        1001);
            }
        }
        call.resolve();
    }

    // ── openExactAlarmSettings — sends user to Alarms & reminders settings ───
    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                    Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    // ── openFullScreenIntentSettings — sends user to Display pop-up settings ─
    @PluginMethod
    public void openFullScreenIntentSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
                    Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(intent);
        }
        call.resolve();
    }

    // ── schedule ─────────────────────────────────────────────────────────────
    @PluginMethod
    public void schedule(PluginCall call) {
        int    id             = call.getInt("id", 0);
        long   fireAt         = call.getLong("fireAt", 0L);
        String title          = call.getString("title", "⏰ Alarm");
        String time           = call.getString("time", "");
        long   repeatMs       = call.getLong("repeatMs", 0L);    // 0 = one-time
        AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        Intent intent   = new Intent(getContext(), AlarmReceiver.class);
        intent.putExtra("id",       id);
        intent.putExtra("title",    title);
        intent.putExtra("time",     time);
        intent.putExtra("repeatMs", repeatMs);

        PendingIntent pi = PendingIntent.getBroadcast(
                getContext(), id, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pi);
        } else {
            am.setExact(AlarmManager.RTC_WAKEUP, fireAt, pi);
        }
        call.resolve();
    }

    // ── dismiss (stop ringing alarm — does NOT cancel future schedules) ────────
    @PluginMethod
    public void dismiss(PluginCall call) {
        int id = call.getInt("id", 0);
        // Stop the foreground ringer service (stops vibration + removes notification)
        AlarmRingerService.stopService(getContext(), id);
        // Clear firing state
        getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().remove(FIRING_KEY).apply();
        // Remove show-over-lock-screen flags now that alarm is done
        if (instance != null) {
            Activity act = instance.getActivity();
            if (act instanceof MainActivity) {
                act.runOnUiThread(() -> ((MainActivity) act).disableLockScreenFlags());
            }
        }
        call.resolve();
    }

    // ── cancel ────────────────────────────────────────────────────────────────
    @PluginMethod
    public void cancel(PluginCall call) {
        int id = call.getInt("id", 0);
        AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        Intent intent   = new Intent(getContext(), AlarmReceiver.class);
        PendingIntent pi = PendingIntent.getBroadcast(
                getContext(), id, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);

        NotificationManager nm =
                (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(id);
        call.resolve();
    }

    public static void notifyFired(Context ctx, int id, String title) {
        SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        JSObject obj = new JSObject();
        obj.put("notificationId", id);
        obj.put("title", title != null ? title : "⏰ Alarm");
        prefs.edit().putString(FIRING_KEY, obj.toString()).apply();

        if (instance != null) {
            instance.notifyListeners("alarmFired", obj, true);
        }
    }

    public static void notifyDismissed(int id) {
        if (instance != null) {
            JSObject obj = new JSObject();
            obj.put("notificationId", id);
            instance.notifyListeners("alarmDismissed", obj, true);
        }
    }
}
