import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { alarmsApi } from '../services/localStore'

// Play a short beep sequence using the Web Audio API (no external files needed)
function playAlarmSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const beep = (startTime, freq = 880, duration = 0.18) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)
      gain.gain.setValueAtTime(0.35, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
      osc.start(startTime)
      osc.stop(startTime + duration)
    }
    const t = ctx.currentTime
    beep(t,        880, 0.2)
    beep(t + 0.25, 1046, 0.2)
    beep(t + 0.5,  880, 0.2)
    beep(t + 0.75, 1046, 0.35)
  } catch (e) {
    // AudioContext blocked (requires user gesture) — silently ignored
  }
}

async function showNotification(label, time) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
  if (Notification.permission === 'granted') {
    new Notification(`⏰ Alarm: ${label || time}`, {
      body: `It's ${time}`,
      icon: '/favicon.ico',
    })
  }
}

export function useAlarmScheduler() {
  const tickRef = useRef(null)

  useEffect(() => {
    // On native Android, LocalNotifications handles firing — no polling needed
    if (Capacitor.isNativePlatform()) return
    // Request notification permission early
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const check = async () => {
      const now   = new Date()
      const hhmm  = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const today = now.getDay() // 0=Sun … 6=Sat
      const dateKey = now.toISOString().slice(0, 10) + 'T' + hhmm

      const alarms = await alarmsApi.getAll()
      let dirty = false

      for (const alarm of alarms) {
        if (!alarm.enabled) continue
        if (alarm.time !== hhmm) continue
        // Avoid re-firing within the same minute
        if (alarm.lastFired === dateKey) continue
        // If days are set, only fire on matching day
        if (alarm.days?.length > 0 && !alarm.days.includes(today)) continue

        // Fire!
        playAlarmSound()
        showNotification(alarm.label, alarm.time)

        alarm.lastFired = dateKey
        // One-time alarm: disable after firing
        if (!alarm.days || alarm.days.length === 0) {
          alarm.enabled = false
        }
        await alarmsApi.update(alarm.id, alarm)
        dirty = true
      }
    }

    check()
    tickRef.current = setInterval(check, 15_000) // check every 15 s

    return () => clearInterval(tickRef.current)
  }, [])
}
