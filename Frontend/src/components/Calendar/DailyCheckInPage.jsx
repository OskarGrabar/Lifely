import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { entriesApi } from '../../services/api'
import { useLocaleContext } from '../../context/LocaleContext'

const OVERALL_DAY_OPTIONS = [
  {
    value: 'great',
    label: 'Great',
    emoji: '😄',
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  },
  {
    value: 'okay',
    label: 'Okay',
    emoji: '🙂',
    activeClass: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  },
  {
    value: 'rough',
    label: 'Rough',
    emoji: '😕',
    activeClass: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
  },
]

const SLEEP_OPTIONS = [
  {
    value: 'great',
    label: 'Great',
    emoji: '😴',
    activeClass: 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300',
  },
  {
    value: 'okay',
    label: 'Okay',
    emoji: '🛏️',
    activeClass: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-300',
  },
  {
    value: 'poor',
    label: 'Poor',
    emoji: '🥱',
    activeClass: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
  },
]

const FOOD_OPTIONS = [
  {
    value: 'healthy',
    label: 'Healthy',
    emoji: '🥗',
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  },
  {
    value: 'balanced',
    label: 'Balanced',
    emoji: '🍽️',
    activeClass: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  },
  {
    value: 'unhealthy',
    label: 'Unhealthy',
    emoji: '🍔',
    activeClass: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
  },
]

const STRESS_OPTIONS = [
  {
    value: 'low',
    label: 'Low Stress',
    emoji: '🧘',
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  },
  {
    value: 'medium',
    label: 'Medium Stress',
    emoji: '😬',
    activeClass: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  },
  {
    value: 'high',
    label: 'High Stress',
    emoji: '😵',
    activeClass: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
  },
]

const ACTIVITY_OPTIONS = [
    {
    value: 'high',
    label: 'Very Active',
    emoji: '🏃',
    activeClass: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300',
  },
{
    value: 'moderate',
    label: 'Moderately Active',
    emoji: '🚶',
    activeClass: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300',
  },
  {
    value: 'low',
    label: 'Not Very Active',
    emoji: '🪑',
    activeClass: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300',
  },
]

const DAILY_BEAN_OPTIONS = [
  { label: 'Shopping', emoji: '🛍️' },
  { label: 'Travel', emoji: '✈️' },
  { label: 'Nature', emoji: '🌿' },
  { label: 'Anxiety', emoji: '😰' },
  { label: 'Irritated', emoji: '😤' },
  { label: 'Focused', emoji: '🎯' },
  { label: 'Brain Fog', emoji: '🌫️' },
  { label: 'Grateful', emoji: '🙏' },
  { label: 'Sad', emoji: '😢' },
  { label: 'Exhausted', emoji: '😮‍💨' },
  { label: 'Busy', emoji: '📋' },
  { label: 'Date', emoji: '💘' },
  { label: 'Bad Weather', emoji: '🌧️' },
  { label: 'Good Weather', emoji: '☀️' },
  { label: 'Off Work', emoji: '🛋️' },
  { label: 'Worked', emoji: '💼' },
  { label: 'Alone', emoji: '🚶' },
  { label: 'Social', emoji: '🗣️' },
  { label: 'Unmotivated', emoji: '😕' },
  { label: 'Motivated', emoji: '🔥' },
  { label: 'Tired', emoji: '🥱' },
  { label: 'Energetic', emoji: '⚡' },
]

export default function DailyCheckInPage() {
  const { t } = useLocaleContext()
  const navigate = useNavigate()
  const [entry, setEntry] = useState(null)
  const [overallDay, setOverallDay] = useState('')
  const [sleepToday, setSleepToday] = useState('')
  const [foodToday, setFoodToday] = useState('')
  const [stressToday, setStressToday] = useState('')
  const [activityToday, setActivityToday] = useState('')
  const [dailyBeans, setDailyBeans] = useState([])
  const [dailyCheckInCompleted, setDailyCheckInCompleted] = useState(false)
  const [step, setStep] = useState(1)
  const [transitionStage, setTransitionStage] = useState('idle')
  const [saving, setSaving] = useState(false)
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const beanSelectionStep = 6
  const submissionStep = 7
  const selectionHoldMs = 180
  const exitDurationMs = 220
  const enterDurationMs = 280

  const wait = (duration) => new Promise(resolve => {
    window.setTimeout(resolve, duration)
  })

  const nextFrame = () => new Promise(resolve => {
    window.requestAnimationFrame(() => resolve())
  })

  useEffect(() => {
    entriesApi.getByDate(todayKey).then(todayEntry => {
      setEntry(todayEntry)
      setOverallDay(todayEntry?.overallDay ?? '')
      setSleepToday(todayEntry?.sleepToday ?? '')
      setFoodToday(todayEntry?.foodToday ?? '')
      setStressToday(todayEntry?.stressToday ?? '')
      setActivityToday(todayEntry?.activityToday ?? '')
      setDailyBeans(todayEntry?.dailyBeans ?? [])
      const completed = todayEntry?.dailyCheckInCompleted ?? false
      setDailyCheckInCompleted(completed)

      if (completed) {
        setStep(1)
      } else if (todayEntry?.activityToday) {
        setStep(beanSelectionStep)
      } else if (todayEntry?.stressToday) {
        setStep(5)
      } else if (todayEntry?.foodToday) {
        setStep(4)
      } else if (todayEntry?.sleepToday) {
        setStep(3)
      } else if (todayEntry?.overallDay) {
        setStep(2)
      } else {
        setStep(1)
      }
    })
  }, [todayKey])

  const persistCheckIn = async ({
    nextOverallDay = overallDay,
    nextSleepToday = sleepToday,
    nextFoodToday = foodToday,
    nextStressToday = stressToday,
    nextActivityToday = activityToday,
    nextDailyBeans = dailyBeans,
    nextDailyCheckInCompleted = dailyCheckInCompleted,
  }) => {
    if (entry?.notes || entry?.values?.length || Object.keys(entry?.impacts || {}).length > 0 || nextOverallDay || nextSleepToday || nextFoodToday || nextStressToday || nextActivityToday || nextDailyBeans.length > 0 || nextDailyCheckInCompleted) {
      const updated = await entriesApi.save(todayKey, {
        notes: entry?.notes ?? '',
        values: entry?.values ?? [],
        impacts: entry?.impacts ?? {},
        overallDay: nextOverallDay,
        sleepToday: nextSleepToday,
        foodToday: nextFoodToday,
        stressToday: nextStressToday,
        activityToday: nextActivityToday,
        dailyBeans: nextDailyBeans,
        dailyCheckInCompleted: nextDailyCheckInCompleted,
      })
      setEntry(updated)
      setDailyBeans(updated.dailyBeans ?? [])
      setDailyCheckInCompleted(updated.dailyCheckInCompleted ?? false)
    } else {
      await entriesApi.delete(todayKey)
      setEntry(null)
      setDailyBeans([])
      setDailyCheckInCompleted(false)
    }
  }

  const animateToStep = async (nextStep) => {
    if (nextStep === step) return

    await wait(selectionHoldMs)
    setTransitionStage('exiting')
    await nextFrame()
    await wait(exitDurationMs)
    setStep(nextStep)
    await nextFrame()
    setTransitionStage('entering')
    await nextFrame()
    await wait(enterDurationMs)
    setTransitionStage('idle')
  }

  const handleSelectOverallDay = async (value) => {
    const nextValue = value
    setSaving(true)
    setOverallDay(nextValue)

    try {
      await persistCheckIn({ nextOverallDay: nextValue, nextSleepToday: sleepToday, nextFoodToday: foodToday, nextStressToday: stressToday, nextActivityToday: activityToday, nextDailyCheckInCompleted: false })
      if (nextValue) {
        await animateToStep(2)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSelectSleepToday = async (value) => {
    const nextValue = value
    setSaving(true)
    setSleepToday(nextValue)

    try {
      await persistCheckIn({ nextOverallDay: overallDay, nextSleepToday: nextValue, nextFoodToday: foodToday, nextStressToday: stressToday, nextActivityToday: activityToday, nextDailyCheckInCompleted: false })
      if (nextValue) {
        await animateToStep(3)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSelectFoodToday = async (value) => {
    const nextValue = value
    setSaving(true)
    setFoodToday(nextValue)

    try {
      await persistCheckIn({ nextOverallDay: overallDay, nextSleepToday: sleepToday, nextFoodToday: nextValue, nextStressToday: stressToday, nextActivityToday: activityToday, nextDailyCheckInCompleted: false })
      if (nextValue) {
        await animateToStep(4)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSelectStressToday = async (value) => {
    const nextValue = value
    setSaving(true)
    setStressToday(nextValue)

    try {
      await persistCheckIn({ nextOverallDay: overallDay, nextSleepToday: sleepToday, nextFoodToday: foodToday, nextStressToday: nextValue, nextActivityToday: activityToday, nextDailyCheckInCompleted: false })
      if (nextValue) {
        await animateToStep(5)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSelectActivityToday = async (value) => {
    const nextValue = value
    setSaving(true)
    setActivityToday(nextValue)

    try {
      await persistCheckIn({ nextOverallDay: overallDay, nextSleepToday: sleepToday, nextFoodToday: foodToday, nextStressToday: stressToday, nextActivityToday: nextValue, nextDailyCheckInCompleted: false })
      if (nextValue) {
        await animateToStep(beanSelectionStep)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleDailyBean = async (bean) => {
    const nextDailyBeans = dailyBeans.includes(bean)
      ? dailyBeans.filter(item => item !== bean)
      : [...dailyBeans, bean]

    setSaving(true)

    try {
      await persistCheckIn({ nextDailyBeans, nextDailyCheckInCompleted: false })
      setDailyBeans(nextDailyBeans)
    } finally {
      setSaving(false)
    }
  }

  const handleFinishCheckIn = async () => {
    setSaving(true)

    try {
      await persistCheckIn({ nextDailyCheckInCompleted: true })
      window.dispatchEvent(new CustomEvent('tut-action-done'))
      navigate('/calendar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 py-2">
      <section className="overflow-hidden rounded-[28px] border border-gray-200 dark:border-gray-700 shadow-sm" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className={`daily-check-in-stage border-b border-gray-100 bg-gradient-to-r from-amber-50/60 via-transparent to-emerald-50/60 px-5 py-5 dark:border-gray-700 dark:from-transparent dark:via-transparent dark:to-transparent ${transitionStage === 'exiting' ? 'daily-check-in-stage-exit' : transitionStage === 'entering' ? 'daily-check-in-stage-enter' : ''}`}>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary-500 dark:text-primary-400">{t('daily_check_in')}</p>
          <h1 className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100">
            {step === 1
              ? t('q_overall_day')
              : step === 2
                ? t('q_sleep')
                : step === 3
                  ? t('q_food')
                  : step === 4
                    ? t('q_stress')
                    : step === 5
                      ? t('q_activity')
                      : step === beanSelectionStep
                        ? t('q_beans')
                        : t('q_submit_done')}
          </h1>
        </div>

        <div className={`daily-check-in-stage px-5 py-6 ${transitionStage === 'exiting' ? 'daily-check-in-stage-exit' : transitionStage === 'entering' ? 'daily-check-in-stage-enter' : ''}`}>
            {step === submissionStep ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-4 text-sm text-gray-600 dark:text-gray-300" style={{ backgroundColor: 'var(--bg)' }}>
                {t('submit_hint')}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleFinishCheckIn}
                  className="rounded-2xl border border-primary-500 bg-primary-500 px-4 py-4 text-sm font-semibold text-white transition-colors active:bg-primary-600 disabled:opacity-60"
                >
                  {t('btn_submit')}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => animateToStep(beanSelectionStep)}
                  className="rounded-2xl border border-gray-300 dark:border-gray-600 px-4 py-4 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors active:opacity-80"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  {t('go_back')}
                </button>
                
              </div>
            </div>
          ) : step === beanSelectionStep ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-4 text-sm text-gray-600 dark:text-gray-300" style={{ backgroundColor: 'var(--bg)' }}>
                {t('bean_hint')}
              </div>

              <div className="flex flex-wrap gap-3">
                {DAILY_BEAN_OPTIONS.map(bean => {
                  const isSelected = dailyBeans.includes(bean.label)

                  return (
                    <button
                      key={bean.label}
                      type="button"
                      disabled={saving}
                      onClick={() => handleToggleDailyBean(bean.label)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                        isSelected
                            ? 'border-primary-500 bg-primary-500 text-white shadow-[0_10px_30px_-16px_rgba(34,197,94,0.85)]'
                            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'
                      } ${saving ? 'opacity-60' : 'active:scale-[0.99]'}`}
                    >
                      <span className="text-base leading-none">{bean.emoji}</span>
                      <span>{t('bean_' + bean.label.toLowerCase().replace(/\s+/g, '_'))}</span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => animateToStep(submissionStep)}
                className="w-full rounded-2xl border border-primary-500 bg-primary-500 px-4 py-4 text-sm font-semibold text-white transition-colors active:bg-primary-600 disabled:opacity-60"
              >
                {t('btn_continue')}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => animateToStep(5)}
                className="w-full rounded-2xl border border-gray-300 dark:border-gray-600 px-4 py-4 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors active:opacity-80"
                style={{ backgroundColor: 'var(--bg-card)' }}
              >
                {t('go_back')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3">
                {(step === 1 ? OVERALL_DAY_OPTIONS : step === 2 ? SLEEP_OPTIONS : step === 3 ? FOOD_OPTIONS : step === 4 ? STRESS_OPTIONS : ACTIVITY_OPTIONS).map(option => {
                const isSelected = step === 1
                  ? overallDay === option.value
                  : step === 2
                    ? sleepToday === option.value
                    : step === 3
                      ? foodToday === option.value
                      : step === 4
                        ? stressToday === option.value
                        : activityToday === option.value

                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        if (step === 1) {
                          handleSelectOverallDay(option.value)
                        } else if (step === 2) {
                          handleSelectSleepToday(option.value)
                        } else if (step === 3) {
                          handleSelectFoodToday(option.value)
                        } else if (step === 4) {
                          handleSelectStressToday(option.value)
                        } else {
                          handleSelectActivityToday(option.value)
                        }
                      }}
                      className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all duration-200 ${
                        isSelected
                          ? `${option.activeClass} shadow-[0_16px_40px_-24px_rgba(15,23,42,0.45)]`
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'
                      } ${saving ? 'opacity-60' : 'active:scale-[0.99]'}`}
                    >
                      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-2xl shadow-sm" style={{ backgroundColor: 'var(--bg-card)' }}>
                        {option.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold">
                          {step === 1 ? t('day_' + option.value)
                            : step === 2 ? t('sleep_' + option.value)
                            : step === 3 ? t('food_' + option.value)
                            : step === 4 ? t('stress_' + option.value)
                            : t('activity_' + option.value)}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {step > 1 && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => animateToStep(Math.max(1, step - 1))}
                  className="w-full rounded-2xl border border-gray-300 dark:border-gray-600 px-4 py-4 text-sm font-semibold text-gray-700 dark:text-gray-200 transition-colors active:opacity-80"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  {t('go_back')}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}