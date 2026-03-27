import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import { useAlarmScheduler } from '../../hooks/useAlarmScheduler'
import { useAlarmFiring, getStoredFiring } from '../../hooks/useAlarmFiring'
import { useEffect, useState, useCallback } from 'react'
import {
  requestAlarmPermission,
  checkAlarmPermissions,
  openExactAlarmSettings,
  openFullScreenIntentSettings,
  rescheduleAll,
} from '../../services/nativeAlarms'
import { alarmsApi, medicationTrackerApi } from '../../services/localStore'
import AlarmDismissOverlay from '../Alarms/AlarmDismissOverlay'
import PermissionPrompt from '../Alarms/PermissionPrompt'
import Toast from '../common/Toast'

// Layout is the runtime coordinator for app-wide behaviors that are larger than
// a single page: route transitions, permission prompts, ringing-alarm recovery,
// snooze feedback, and the full-screen dismiss overlay.
function formatLocalDate(timestamp) {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function Layout() {
  useAlarmScheduler()
  const location = useLocation()

  // Restore overlay if the app was killed while alarm was ringing
  const [firingAlarm, setFiringAlarm] = useState(() => getStoredFiring())
  // Which permission prompt is currently showing (null | 'notifications' | 'exactAlarm' | 'fullScreen')
  const [permPrompt, setPermPrompt] = useState(null)

  const [snoozeToast, setSnoozeToast] = useState(null)

  const handleDismiss = useCallback(() => setFiringAlarm(null), [])

  const handleFire = useCallback(async (alarm) => {
    // Clear any pending snooze record — alarm is firing now
    localStorage.removeItem('ht_snooze')
    window.dispatchEvent(new CustomEvent('alarms-changed'))
    // Enrich with full alarm record (includes meds, label, etc.)
    let enriched = alarm
    const alarmId = alarm.alarmId || Math.floor((alarm.notificationId ?? 0) / 100)
    if (alarmId > 0) {
      const all = await alarmsApi.getAll()
      const rec = all.find(a => a.id === alarmId)
      if (rec) {
        enriched = { ...alarm, ...rec, alarmId, notificationId: alarm.notificationId }
        if (!rec.days || rec.days.length === 0) {
          await alarmsApi.update(alarmId, { ...rec, enabled: false })
          window.dispatchEvent(new CustomEvent('alarms-changed'))
        }
      }
    }
    setFiringAlarm(enriched)
  }, [])

  const { dismiss, snooze } = useAlarmFiring(handleFire, handleDismiss)

  // Check permissions and show the first missing one
  const runPermissionCheck = useCallback(async () => {
    const perms = await checkAlarmPermissions()
    if (!perms.hasNotifications) { setPermPrompt('notifications'); return }
    if (!perms.canExactAlarm)    { setPermPrompt('exactAlarm');    return }
    if (!perms.canFullScreen)    { setPermPrompt('fullScreen');    return }
    setPermPrompt(null)
  }, [])

  useEffect(() => {
    const init = async () => {
      await runPermissionCheck()
      const alarms = await alarmsApi.getAll()
      await rescheduleAll(alarms)
    }
    init()

    // Re-check when user returns from the Settings app
    const onVisible = () => { if (document.visibilityState === 'visible') runPermissionCheck() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [runPermissionCheck])

  useEffect(() => {
    if (!firingAlarm?.alarmId || Array.isArray(firingAlarm.meds)) return

    const enrichStoredAlarm = async () => {
      const all = await alarmsApi.getAll()
      const rec = all.find(alarm => alarm.id === firingAlarm.alarmId)
      if (rec) {
        setFiringAlarm(current => {
          if (!current || current.alarmId !== firingAlarm.alarmId || Array.isArray(current.meds)) {
            return current
          }
          return { ...current, ...rec, notificationId: current.notificationId, alarmId: current.alarmId }
        })
      }
    }

    enrichStoredAlarm()
  }, [firingAlarm])

  const handleMedicationTaken = useCallback(async () => {
    if (!firingAlarm?.notificationId) return

    const meds = (firingAlarm.meds || []).map(med => med?.name?.trim()).filter(Boolean)
    const date = formatLocalDate(firingAlarm.firedAt ?? Date.now())

    for (const medicationName of meds) {
      await medicationTrackerApi.setTaken(date, medicationName, true)
    }

    window.dispatchEvent(new CustomEvent('medication-tracker-changed'))
    dismiss(firingAlarm.notificationId)
  }, [dismiss, firingAlarm])

  // Action button handler per permission type
  const handlePermAction = async () => {
    if (permPrompt === 'notifications') {
      await requestAlarmPermission()   // shows inline Android dialog
      setPermPrompt(null)
      // Re-check after a short delay so Android dialog has time to resolve
      setTimeout(runPermissionCheck, 800)
    } else if (permPrompt === 'exactAlarm') {
      setPermPrompt(null)
      await openExactAlarmSettings()   // user goes to Settings; visibilitychange will re-check
    } else if (permPrompt === 'fullScreen') {
      setPermPrompt(null)
      await openFullScreenIntentSettings()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Page content — padded so content never hides behind the bottom nav */}
      <main key={location.pathname} className="page-transition flex-1 px-3 pt-4 pb-32 overflow-y-auto overscroll-contain flex flex-col min-h-0">
        <Outlet />
      </main>
      <BottomNav />

      {/* Full-screen alarm overlay — shown when alarm fires */}
      {firingAlarm && (
        <AlarmDismissOverlay
          alarm={firingAlarm}
          onDismiss={() => dismiss(firingAlarm.notificationId)}
          onMedicationTaken={handleMedicationTaken}
          onSnooze={() => {
            const ringAt = new Date(Date.now() + 5 * 60 * 1000)
            const hh = String(ringAt.getHours()).padStart(2, '0')
            const mm = String(ringAt.getMinutes()).padStart(2, '0')
            // Persist snooze time so AlarmsPage banner can show it
            localStorage.setItem('ht_snooze', JSON.stringify({ fireAt: ringAt.getTime() }))
            window.dispatchEvent(new CustomEvent('alarms-changed'))
            setSnoozeToast(`Snoozed until ${hh}:${mm}`)
            snooze(firingAlarm.notificationId)
          }}
        />
      )}

      {/* Step-by-step permission prompts */}
      {permPrompt && !firingAlarm && (
        <PermissionPrompt
          permission={permPrompt}
          onAction={handlePermAction}
          onSkip={() => setPermPrompt(null)}
        />
      )}

      {/* Snooze confirmation toast */}
      {snoozeToast && (
        <Toast message={snoozeToast} onClose={() => setSnoozeToast(null)} />
      )}
    </div>
  )
}
