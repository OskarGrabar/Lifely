import { useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { AlarmPlugin } from '../services/nativeAlarms'

const FIRING_KEY = 'ht_alarm_firing'

function saveFiring(alarm)  { localStorage.setItem(FIRING_KEY, JSON.stringify(alarm)) }
function clearFiring()      { localStorage.removeItem(FIRING_KEY) }
export function getStoredFiring() {
  try { return JSON.parse(localStorage.getItem(FIRING_KEY)) } catch { return null }
}

export function useAlarmFiring(onFire, onDismiss) {

  const doFire = useCallback((data) => {
    const payload = {
      notificationId: data.notificationId ?? data.id,
      title: data.title ?? '⏰ Alarm',
    }
    saveFiring(payload)
    onFire?.(payload)
  }, [onFire])

  const doDismiss = useCallback(async (notificationId, snooze = false) => {
    clearFiring()

    if (Capacitor.isNativePlatform()) {
      // AlarmPlugin.dismiss: stops vibration + cancels ongoing notification + clears prefs
      try { await AlarmPlugin.dismiss({ id: notificationId }) } catch (e) {}

      if (snooze) {
        // AlarmActionReceiver in Java handles snooze; from JS just schedule 5-min one-shot
        try {
          await AlarmPlugin.schedule({
            id:       notificationId + 9000,
            fireAt:   Date.now() + 5 * 60 * 1000,
            title:    '⏰ Snoozed Alarm',
            time:     new Date(Date.now() + 5 * 60 * 1000)
                        .toTimeString().slice(0, 5),
            repeatMs: 0,
          })
        } catch (e) {}
      }
    }

    onDismiss?.()
  }, [onDismiss])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    // Fired by AlarmPlugin when alarm triggers (foreground OR cold-start recovery)
    const firedSub = AlarmPlugin.addListener('alarmFired', (data) => {
      doFire(data)
    })

    // Fired by AlarmActionReceiver when user taps Dismiss/Snooze from notification
    const dismissedSub = AlarmPlugin.addListener('alarmDismissed', () => {
      clearFiring()
      onDismiss?.()
    })

    return () => {
      firedSub.then(h => h.remove()).catch(() => {})
      dismissedSub.then(h => h.remove()).catch(() => {})
    }
  }, [doFire, onDismiss])

  return {
    dismiss: (id) => doDismiss(id, false),
    snooze:  (id) => doDismiss(id, true),
  }
}
