import { useEffect, useState } from 'react'

export default function AlarmDismissOverlay({ alarm, onDismiss, onSnooze }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-between bg-gray-900 text-white select-none"
         style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Top label */}
      <div className="flex flex-col items-center pt-16 gap-2">
        <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Alarm</p>
        <p className="text-6xl font-thin tabular-nums">{hh}:{mm}</p>
        {alarm?.title && (
          <p className="text-lg text-gray-300 mt-2">{alarm.title.replace('⏰ ', '')}</p>
        )}
      </div>

      {/* Medications — shown between clock and ring */}
      {alarm?.meds?.length > 0 && (
        <div className="w-full px-6 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-1">Take now</p>
          {alarm.meds.map((med, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gray-800">
              <span className="text-xl">💊</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{med.name}</p>
                {med.amount && (
                  <p className="text-sm text-gray-400">{med.amount} {med.unit}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pulse ring animation */}
      <div className="flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-40 h-40 rounded-full bg-primary-600 opacity-20 animate-ping" />
          <div className="absolute w-32 h-32 rounded-full bg-primary-600 opacity-30 animate-ping [animation-delay:0.3s]" />
          <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center text-4xl shadow-lg">
            ⏰
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full px-8 pb-12 flex flex-col gap-4">
        <button
          onClick={onSnooze}
          className="w-full py-4 rounded-2xl bg-gray-700 active:bg-gray-600 font-semibold text-lg text-gray-200 transition-colors"
        >
          💤 Snooze 5 min
        </button>
        <button
          onClick={onDismiss}
          className="w-full py-4 rounded-2xl bg-primary-600 active:bg-primary-700 font-bold text-xl text-white transition-colors shadow-lg"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
