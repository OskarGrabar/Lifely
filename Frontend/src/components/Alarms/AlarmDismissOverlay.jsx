import { useEffect, useState } from 'react'
import { useLocaleContext } from '../../context/LocaleContext'

export default function AlarmDismissOverlay({ alarm, onDismiss, onSnooze, onMedicationTaken }) {
  const { t } = useLocaleContext()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const medications = alarm?.meds || []

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white select-none overflow-hidden"
         style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Top label */}
      <div className="flex flex-col items-center pt-12 px-6 gap-2 flex-shrink-0 text-center">
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('overlay_alarm')}</p>
        <p className="text-6xl font-thin tabular-nums">{hh}:{mm}</p>
        {alarm?.title && (
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-2">{alarm.title.replace('⏰ ', '')}</p>
        )}
      </div>

      <div className="flex-1 min-h-0 px-4 sm:px-6 py-4 flex flex-col items-center justify-center gap-5 overflow-hidden">
        {medications.length > 0 && (
          <div className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-gray-800 bg-gray-100/80 dark:bg-gray-800/80 p-3 overflow-hidden flex-shrink min-h-0">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-center mb-3">{t('overlay_take_now')}</p>
            <div className="space-y-2 overflow-y-auto max-h-[28dvh] pr-1 overscroll-contain">
              {medications.map((med, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-gray-200/70 dark:bg-gray-700/70">
                  <span className="text-xl leading-none mt-0.5">💊</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white break-words leading-snug">{med.name}</p>
                    {med.amount && (
                      <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">{med.amount} {med.unit}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pulse ring animation */}
        <div className="flex items-center justify-center flex-shrink-0 py-2">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-40 h-40 rounded-full bg-primary-600 opacity-20 animate-ping" />
            <div className="absolute w-32 h-32 rounded-full bg-primary-600 opacity-30 animate-ping [animation-delay:0.3s]" />
            <div className="w-24 h-24 rounded-full bg-primary-600 flex items-center justify-center text-4xl shadow-lg">
              ⏰
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full px-6 sm:px-8 pb-8 pt-4 flex flex-col gap-3 flex-shrink-0">
        <button
          onClick={onSnooze}
          className="w-full py-4 rounded-2xl bg-gray-200 dark:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600 font-semibold text-lg text-gray-700 dark:text-gray-200 transition-colors"
        >
          {t('btn_snooze')}
        </button>
        {medications.length > 0 && (
          <button
            onClick={onMedicationTaken}
            className="w-full py-4 rounded-2xl bg-emerald-600 active:bg-emerald-700 font-bold text-lg text-white transition-colors shadow-lg"
          >
            {t('btn_med_taken')}
          </button>
        )}
        <button
          onClick={onDismiss}
          className="w-full py-4 rounded-2xl bg-primary-600 active:bg-primary-700 font-bold text-xl text-white transition-colors shadow-lg"
        >
          {t('btn_dismiss')}
        </button>
      </div>
    </div>
  )
}
