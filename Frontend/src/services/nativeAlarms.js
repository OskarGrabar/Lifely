import { Capacitor, registerPlugin } from '@capacitor/core'

// Custom native plugin registered in MainActivity.java.
// Guard against double-registration (Vite HMR re-evaluates modules in dev).
export const AlarmPlugin =
  Capacitor.Plugins['AlarmPlugin'] ?? registerPlugin('AlarmPlugin')

const MS_DAY  = 86_400_000
const MS_WEEK = 604_800_000

// Next timestamp for HH:MM today, or tomorrow if already passed
function nextOccurrenceToday(hour, minute) {
  const now  = Date.now()
  const next = new Date()
  next.setHours(hour, minute, 0, 0)
  if (next.getTime() <= now) next.setDate(next.getDate() + 1)
  return next.getTime()
}

// Next timestamp for HH:MM on a given weekday (0=Sun…6=Sat)
function nextOccurrenceOfWeekday(dow, hour, minute) {
  const now  = Date.now()
  const next = new Date()
  next.setHours(hour, minute, 0, 0)
  const diff = (dow - next.getDay() + 7) % 7
  if (diff === 0 && next.getTime() <= now) {
    next.setDate(next.getDate() + 7)
  } else {
    next.setDate(next.getDate() + diff)
  }
  return next.getTime()
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function checkAlarmPermissions() {
  if (!Capacitor.isNativePlatform()) return { hasNotifications: true, canExactAlarm: true, canFullScreen: true }
  try {
    return await AlarmPlugin.checkAlarmPermissions()
  } catch (e) {
    return { hasNotifications: true, canExactAlarm: true, canFullScreen: true }
  }
}

export async function requestAlarmPermission() {
  if (!Capacitor.isNativePlatform()) return
  try { await AlarmPlugin.requestAlarmPermissions() } catch (e) {}
}

export async function openExactAlarmSettings() {
  if (!Capacitor.isNativePlatform()) return
  try { await AlarmPlugin.openExactAlarmSettings() } catch (e) {}
}

export async function openFullScreenIntentSettings() {
  if (!Capacitor.isNativePlatform()) return
  try { await AlarmPlugin.openFullScreenIntentSettings() } catch (e) {}
}

export async function scheduleAlarm(alarm) {
  if (!Capacitor.isNativePlatform()) return
  await cancelAlarm(alarm.id)
  if (!alarm.enabled) return

  const [hour, minute] = alarm.time.split(':').map(Number)
  const title = alarm.label ? `⏰ ${alarm.label}` : '⏰ Alarm'

  if (!alarm.days || alarm.days.length === 0) {
    // One-time
    await AlarmPlugin.schedule({
      id:       alarm.id * 100,
      fireAt:   nextOccurrenceToday(hour, minute),
      title,
      time:     alarm.time,
      repeatMs: 0,
    })
  } else if (alarm.days.length === 7) {
    // Every day — receiver reschedules itself after firing
    await AlarmPlugin.schedule({
      id:       alarm.id * 100,
      fireAt:   nextOccurrenceToday(hour, minute),
      title,
      time:     alarm.time,
      repeatMs: MS_DAY,
    })
  } else {
    // Custom days — one self-rescheduling alarm per selected weekday
    for (let slot = 0; slot < alarm.days.length; slot++) {
      await AlarmPlugin.schedule({
        id:       alarm.id * 100 + slot + 1,
        fireAt:   nextOccurrenceOfWeekday(alarm.days[slot], hour, minute),
        title,
        time:     alarm.time,
        repeatMs: MS_WEEK,
      })
    }
  }
}

export async function cancelAlarm(alarmId) {
  if (!Capacitor.isNativePlatform()) return
  for (let i = 0; i < 10; i++) {
    try { await AlarmPlugin.cancel({ id: alarmId * 100 + i }) } catch (e) {}
  }
}

export async function rescheduleAll(alarms) {
  if (!Capacitor.isNativePlatform()) return
  for (const alarm of alarms) {
    await scheduleAlarm(alarm)
  }
}

