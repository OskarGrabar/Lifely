import { useState, useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  format, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks,
  eachDayOfInterval, isToday,
} from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { metricsApi, entriesApi } from '../../services/api'
import { alarmsApi, medicationTrackerApi } from '../../services/localStore'
import { useThemeContext } from '../../context/ThemeContext'
import { useLocaleContext } from '../../context/LocaleContext'

const RANGE_OPTIONS = [
  { label: '1W', days: 7 },
  { label: '2W', days: 14 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 180 },
]

const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MED_CONFETTI_PARTICLES = [
  { x: -110, y: -180, rotate: -42, color: '#f97316', delay: '0ms' },
  { x: -72, y: -220, rotate: -22, color: '#fb7185', delay: '60ms' },
  { x: -36, y: -156, rotate: -8, color: '#facc15', delay: '20ms' },
  { x: -12, y: -245, rotate: 26, color: '#38bdf8', delay: '110ms' },
  { x: 24, y: -198, rotate: -14, color: '#a855f7', delay: '40ms' },
  { x: 0, y: -272, rotate: 0, color: '#22c55e', delay: '0ms' },
  { x: 52, y: -162, rotate: 18, color: '#34d399', delay: '90ms' },
  { x: 88, y: -232, rotate: 34, color: '#f59e0b', delay: '35ms' },
  { x: 38, y: -176, rotate: 20, color: '#60a5fa', delay: '130ms' },
  { x: 112, y: -208, rotate: 38, color: '#f43f5e', delay: '75ms' },
  { x: 126, y: -142, rotate: 48, color: '#10b981', delay: '10ms' },
  { x: 0, y: -124, rotate: -4, color: '#fde047', delay: '150ms' },
]

const DAY_TREND_OPTIONS = [
  {
    value: 'great',
    label: 'Great',
    accentClass: 'bg-primary-600 text-white border-primary-600',
    inactiveClass: 'border-primary-200 text-primary-700 dark:border-primary-800 dark:text-primary-300',
  },
  {
    value: 'okay',
    label: 'Okay',
    accentClass: 'bg-amber-500 text-white border-amber-500',
    inactiveClass: 'border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300',
  },
  {
    value: 'rough',
    label: 'Rough',
    accentClass: 'bg-rose-500 text-white border-rose-500',
    inactiveClass: 'border-rose-200 text-rose-700 dark:border-rose-900 dark:text-rose-300',
  },
]

const TREND_VALUE_META = {
  sleepToday: {
    great: { label: 'Great sleep', labelKey: 'trend_sleep_great', icon: '😴', tone: 'emerald' },
    okay:  { label: 'Okay sleep',  labelKey: 'trend_sleep_okay',  icon: '🛏️', tone: 'sky'     },
    poor:  { label: 'Poor sleep',  labelKey: 'trend_sleep_poor',  icon: '🥱', tone: 'rose'    },
  },
  foodToday: {
    healthy:   { label: 'Healthy food',   labelKey: 'trend_food_healthy',   icon: '🥗', tone: 'emerald' },
    balanced:  { label: 'Balanced food',  labelKey: 'trend_food_balanced',  icon: '🍽️', tone: 'amber'   },
    unhealthy: { label: 'Unhealthy food', labelKey: 'trend_food_unhealthy', icon: '🍔', tone: 'rose'    },
  },
  stressToday: {
    low:    { label: 'Low stress',    labelKey: 'trend_stress_low',    icon: '🧘', tone: 'emerald' },
    medium: { label: 'Medium stress', labelKey: 'trend_stress_medium', icon: '😬', tone: 'amber'   },
    high:   { label: 'High stress',   labelKey: 'trend_stress_high',   icon: '😵', tone: 'rose'    },
  },
  activityToday: {
    high:     { label: 'Very active',        labelKey: 'trend_activity_high',     icon: '🏃', tone: 'emerald' },
    moderate: { label: 'Moderately active',  labelKey: 'trend_activity_moderate', icon: '🚶', tone: 'amber'   },
    low:      { label: 'Not very active',    labelKey: 'trend_activity_low',      icon: '🪑', tone: 'rose'    },
  },
}

const TREND_TONE_CLASS = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/30 dark:text-emerald-300',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/30 dark:text-amber-300',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/30 dark:text-rose-300',
  sky: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/80 dark:bg-sky-950/30 dark:text-sky-300',
  gray: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-200',
}

function uniqueMedicationNames(alarms) {
  return [...new Set(
    alarms
      .flatMap(alarm => alarm.meds || [])
      .map(med => med?.name?.trim())
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right))
}

function ChartTooltip({ active, label, payload, metricsById, normalize, originalData, isDark }) {
  if (!active || !payload?.length || !label) return null

  return (
    <div
      className={`min-w-[180px] rounded-2xl border px-3 py-3 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.45)] backdrop-blur-sm ${
        isDark
          ? 'border-gray-700 bg-gray-900/92 text-gray-100'
          : 'border-white/70 bg-white/92 text-gray-900'
      }`}
    >
      <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {format(new Date(label + 'T00:00:00'), 'MMM d, yyyy')}
      </p>
      <div className="mt-2 space-y-2">
        {payload.map(item => {
          const metric = metricsById.get(String(item.dataKey))
          const originalValue = originalData[label]?.[item.dataKey]
          const displayValue = normalize && item.value !== null
            ? `${item.value}%${originalValue !== null && originalValue !== undefined ? ` (${originalValue}${metric?.unit ? ` ${metric.unit}` : ''})` : ''}`
            : `${item.value}${metric?.unit ? ` ${metric.unit}` : ''}`

          return (
            <div key={String(item.dataKey)} className="flex items-start gap-2.5">
              <span
                className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color || metric?.color || '#22c55e' }}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {metric?.name || item.name}
                </p>
                <p className="text-sm font-semibold leading-5 break-words">{displayValue}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function startCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function buildImpactTrend(key, value) {
  const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, char => char.toUpperCase())
  return {
    key: `impact:${key}:${value}`,
    label: `${label} felt ${value === 'good' ? 'good' : 'bad'}`,
    icon: value === 'good' ? '↗' : '↘',
    tone: value === 'good' ? 'emerald' : 'rose',
  }
}

const DAILY_BEAN_EMOJIS = {
  Shopping: '🛍️',
  Travel: '✈️',
  Nature: '🌿',
  Anxiety: '😰',
  Irritated: '😤',
  Focused: '🎯',
  'Brain Fog': '🌫️',
  Grateful: '🙏',
  Sad: '😢',
  Exhausted: '😮‍💨',
  Busy: '📋',
  Date: '💘',
  'Bad Weather': '🌧️',
  'Good Weather': '☀️',
  'Off Work': '🛋️',
  Worked: '💼',
  Alone: '🚶',
  Social: '🗣️',
  Unmotivated: '😕',
  Motivated: '🔥',
  Tired: '🥱',
  Energetic: '⚡',
}

const DAILY_BEAN_TONES = {
  Shopping: 'amber',
  Travel: 'sky',
  Nature: 'emerald',
  Anxiety: 'rose',
  Irritated: 'rose',
  Focused: 'sky',
  'Brain Fog': 'gray',
  Grateful: 'emerald',
  Sad: 'rose',
  Exhausted: 'gray',
  Busy: 'amber',
  Date: 'emerald',
  'Bad Weather': 'gray',
  'Good Weather': 'amber',
  'Off Work': 'sky',
  Worked: 'amber',
  Alone: 'gray',
  Social: 'sky',
  Unmotivated: 'rose',
  Motivated: 'emerald',
  Tired: 'gray',
  Energetic: 'emerald',
}

function buildDailyBeanTrend(bean) {
  return {
    key: `bean:${bean}`,
    label: bean,
    labelKey: `bean_${bean.toLowerCase().replace(/\s+/g, '_')}`,
    icon: DAILY_BEAN_EMOJIS[bean] || '•',
    tone: DAILY_BEAN_TONES[bean] || 'gray',
  }
}

function getEntryTrendSignals(entry) {
  const signals = []

  Object.entries(TREND_VALUE_META).forEach(([field, valueMap]) => {
    const fieldValue = entry?.[field]
    if (!fieldValue || !valueMap[fieldValue]) return

    signals.push({
      key: `${field}:${fieldValue}`,
      ...valueMap[fieldValue],
    })
  })

  Object.entries(entry?.impacts || {}).forEach(([key, value]) => {
    if (value !== 'good' && value !== 'bad') return
    signals.push(buildImpactTrend(key, value))
  })

  ;(entry?.dailyBeans || []).forEach(bean => {
    if (!bean) return
    signals.push(buildDailyBeanTrend(bean))
  })

  return signals
}

export default function HealthTrendsChart() {
  const { theme } = useThemeContext()
  const { t } = useLocaleContext()
  const [allMetrics, setAllMetrics] = useState([])
  const [entries, setEntries] = useState([])
  const [allEntries, setAllEntries] = useState([])
  const [selected, setSelected] = useState([])
  const [range, setRange] = useState(30)
  const [loading, setLoading] = useState(false)
  const [normalize, setNormalize] = useState(false)
  const [hideTouchTooltip, setHideTouchTooltip] = useState(false)
  const [selectedTrendDayType, setSelectedTrendDayType] = useState('rough')

  const [weekAnchor, setWeekAnchor] = useState(new Date())
  const [alarms, setAlarms] = useState([])
  const [trackerByDate, setTrackerByDate] = useState({})
  const [trackerLoading, setTrackerLoading] = useState(false)
  const [savingCell, setSavingCell] = useState('')
  const [medCelebrationBurst, setMedCelebrationBurst] = useState(null)

  const chartableMetrics = useMemo(
    () => allMetrics.filter(metric => !metric.calendarOnly),
    [allMetrics]
  )

  const weekStart = useMemo(() => startOfWeek(weekAnchor), [weekAnchor])
  const weekEnd = useMemo(() => endOfWeek(weekAnchor), [weekAnchor])
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  )

  const medicationNames = useMemo(() => uniqueMedicationNames(alarms), [alarms])
  const metricsById = useMemo(
    () => new Map(allMetrics.map(metric => [String(metric.id), metric])),
    [allMetrics]
  )
  const isDark = theme === 'dark' || (theme === 'system' && typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))

  useEffect(() => {
    metricsApi.getAll().then(data => {
      setAllMetrics(data)
      const chartable = data.filter(metric => !metric.calendarOnly)
      setSelected(chartable.slice(0, 3).map(metric => metric.id))
    })
  }, [])

  useEffect(() => {
    const end = format(new Date(), 'yyyy-MM-dd')
    const start = format(subDays(new Date(), range), 'yyyy-MM-dd')
    setLoading(true)
    entriesApi.getRange(start, end)
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [range])

  useEffect(() => {
    entriesApi.getAll().then(setAllEntries)
  }, [])

  useEffect(() => {
    const reloadEntries = async () => {
      const end = format(new Date(), 'yyyy-MM-dd')
      const start = format(subDays(new Date(), range), 'yyyy-MM-dd')

      const [rangeEntries, nextAllEntries] = await Promise.all([
        entriesApi.getRange(start, end),
        entriesApi.getAll(),
      ])

      setEntries(rangeEntries)
      setAllEntries(nextAllEntries)
    }

    window.addEventListener('entries-changed', reloadEntries)
    return () => window.removeEventListener('entries-changed', reloadEntries)
  }, [range])

  useEffect(() => {
    alarmsApi.getAll().then(setAlarms)
  }, [])

  useEffect(() => {
    const loadTracker = async () => {
      setTrackerLoading(true)
      const start = format(weekStart, 'yyyy-MM-dd')
      const end = format(weekEnd, 'yyyy-MM-dd')
      const data = await medicationTrackerApi.getRange(start, end)
      setTrackerByDate(data)
      setTrackerLoading(false)
    }

    loadTracker()
  }, [weekEnd, weekStart])

  useEffect(() => {
    const reloadTracker = async () => {
      const start = format(weekStart, 'yyyy-MM-dd')
      const end = format(weekEnd, 'yyyy-MM-dd')
      const data = await medicationTrackerApi.getRange(start, end)
      setTrackerByDate(data)
    }

    window.addEventListener('medication-tracker-changed', reloadTracker)
    return () => window.removeEventListener('medication-tracker-changed', reloadTracker)
  }, [weekEnd, weekStart])

  const rawData = useMemo(() => {
    const byDate = {}
    entries.forEach(entry => {
      byDate[entry.date] = byDate[entry.date] || {}
      entry.values.forEach(value => {
        const metric = allMetrics.find(item => item.id === value.metricId)
        if (!metric || metric.calendarOnly) return
        const num = parseFloat(value.value)
        if (!isNaN(num)) byDate[entry.date][value.metricId] = num
        else if (value.value === 'Yes') byDate[entry.date][value.metricId] = 1
        else if (value.value === 'No') byDate[entry.date][value.metricId] = 0
      })
    })

    return Object.entries(byDate)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([date, values]) => {
        const row = { date }
        selected.forEach(id => {
          row[id] = values[id] !== undefined ? values[id] : null
        })
        return row
      })
  }, [entries, allMetrics, selected])

  const chartData = useMemo(() => {
    if (!normalize) return rawData

    const maxMap = {}
    selected.forEach(id => {
      const values = rawData.map(row => row[id]).filter(value => value !== null && value !== undefined)
      if (!values.length) return
      maxMap[id] = Math.max(...values) || 1
    })

    return rawData.map(row => {
      const out = { date: row.date }
      selected.forEach(id => {
        if (row[id] === null || row[id] === undefined || !maxMap[id]) {
          out[id] = null
          return
        }
        out[id] = Math.round((row[id] / maxMap[id]) * 100)
      })
      return out
    })
  }, [rawData, normalize, selected])

  const originalData = useMemo(() => {
    const map = {}
    rawData.forEach(row => { map[row.date] = row })
    return map
  }, [rawData])

  const trendSummary = useMemo(() => {
    const matchingEntries = allEntries.filter(entry => entry?.overallDay === selectedTrendDayType)
    const counts = new Map()

    matchingEntries.forEach(entry => {
      getEntryTrendSignals(entry).forEach(signal => {
        const existing = counts.get(signal.key)
        if (existing) {
          existing.count += 1
          return
        }

        counts.set(signal.key, { ...signal, count: 1 })
      })
    })

    const topTrends = [...counts.values()]
      .sort((left, right) => {
        if (right.count !== left.count) return right.count - left.count
        return left.label.localeCompare(right.label)
      })
      .slice(0, 5)
      .map(item => ({
        ...item,
        percentage: matchingEntries.length > 0 ? Math.round((item.count / matchingEntries.length) * 100) : 0,
      }))

    return {
      dayLabel: DAY_TREND_OPTIONS.find(option => option.value === selectedTrendDayType)?.label ?? startCase(selectedTrendDayType),
      totalDays: matchingEntries.length,
      topTrends,
    }
  }, [allEntries, selectedTrendDayType])

  const toggleMetric = (id) => {
    setSelected(prev => (
      prev.includes(id) ? prev.filter(value => value !== id) : [...prev, id]
    ))
  }

  const isMedicationTaken = (date, medicationName) => {
    return Boolean(trackerByDate[date]?.[medicationName])
  }

  const toggleMedicationTaken = async (date, medicationName, buttonEl) => {
    const rect = buttonEl?.getBoundingClientRect()
    const cellKey = `${date}:${medicationName}`
    const nextTaken = !isMedicationTaken(date, medicationName)

    setSavingCell(cellKey)
    await medicationTrackerApi.setTaken(date, medicationName, nextTaken)

    setTrackerByDate(prev => {
      const next = { ...prev }
      const day = { ...(next[date] ?? {}) }

      if (nextTaken) {
        day[medicationName] = true
        next[date] = day
      } else {
        delete day[medicationName]
        if (Object.keys(day).length > 0) next[date] = day
        else delete next[date]
      }

      return next
    })

    if (nextTaken && rect) {
      setMedCelebrationBurst({ id: Date.now(), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    }

    setSavingCell('')
  }

  // Clear confetti burst after animation
  useEffect(() => {
    if (!medCelebrationBurst) return
    const t = setTimeout(() => setMedCelebrationBurst(null), 1200)
    return () => clearTimeout(t)
  }, [medCelebrationBurst])

  const showTouchTooltip = () => setHideTouchTooltip(false)
  const hideTooltipOnTouchEnd = () => setHideTouchTooltip(true)

  return (
    <>
      {medCelebrationBurst && createPortal(
        <div key={medCelebrationBurst.id} className="habit-page-confetti-layer" aria-hidden="true">
          {MED_CONFETTI_PARTICLES.map((particle, index) => (
            <span
              key={`med-confetti-${medCelebrationBurst.id}-${index}`}
              className="habit-page-confetti-piece"
              style={{
                left: `${medCelebrationBurst.x}px`,
                top: `${medCelebrationBurst.y}px`,
                backgroundColor: particle.color,
                '--burst-x': `${particle.x}px`,
                '--burst-y': `${particle.y}px`,
                '--burst-rotate': `${particle.rotate}deg`,
                animationDelay: particle.delay,
              }}
            />
          ))}
        </div>,
        document.body
      )}
      <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('page_health')}</h1>

      <div data-tutorial="trends-chart" className="card">
        <div className="mb-3 flex flex-wrap justify-center gap-2 pb-1">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.days}
              onClick={() => setRange(opt.days)}
              className={`px-4 py-2 text-sm rounded-full font-semibold transition-colors ${
                range === opt.days
                  ? 'bg-primary-600 text-white'
                  : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 active:bg-gray-50 dark:active:bg-gray-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">{t('loading')}</div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm text-center px-4">
            {t('no_data_period')}
          </div>
        ) : selected.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm text-center px-4">
            {t('tap_metric_below')}
          </div>
        ) : (
          <>
            {normalize && (
              <p className="text-xs text-amber-600 text-center mb-2">{t('normalize_disclaimer')}</p>
            )}
            <div
              onTouchStart={showTouchTooltip}
              onTouchMove={showTouchTooltip}
              onTouchEnd={hideTooltipOnTouchEnd}
              onTouchCancel={hideTooltipOnTouchEnd}
            >
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={date => format(new Date(date + 'T00:00:00'), 'MMM d')}
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    width={normalize ? 36 : 30}
                    tickFormatter={value => normalize ? `${value}%` : value}
                    domain={normalize ? [0, 100] : ['auto', 'auto']}
                  />
                  <Tooltip
                    cursor={hideTouchTooltip ? false : { stroke: isDark ? '#4b5563' : '#cbd5e1', strokeDasharray: '4 4' }}
                    content={hideTouchTooltip ? <></> : (
                      <ChartTooltip
                        metricsById={metricsById}
                        normalize={normalize}
                        originalData={originalData}
                        isDark={isDark}
                      />
                    )}
                  />
                  {selected.map(id => {
                    const metric = allMetrics.find(item => item.id === id)
                    return metric ? (
                      <Line
                        key={id}
                        type="monotone"
                        dataKey={id}
                        stroke={metric.color || '#22c55e'}
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        activeDot={hideTouchTooltip ? false : { r: 4 }}
                        connectNulls
                      />
                    ) : null
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {chartableMetrics.length > 0 && (
          <div className="mt-3 space-y-3 border-t border-gray-200 pt-3 dark:border-gray-700">
            <div className="flex flex-wrap justify-center gap-2">
              {chartableMetrics.map(metric => {
                const isOn = selected.includes(metric.id)
                return (
                  <button
                    key={metric.id}
                    type="button"
                    onClick={() => toggleMetric(metric.id)}
                    className={`px-3 py-2 text-sm rounded-full font-medium border transition-all min-h-[36px] ${
                      isOn ? 'text-white border-transparent' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                    }`}
                    style={isOn ? { backgroundColor: metric.color || '#22c55e', borderColor: metric.color || '#22c55e' } : {}}
                  >
                    {metric.name}
                    {metric.unit && <span className="ml-1 opacity-70">({metric.unit})</span>}
                  </button>
                )
              })}
            </div>

            {selected.length > 1 && (
              <button
                type="button"
                onClick={() => setNormalize(value => !value)}
                className={`mx-auto flex w-full max-w-xl items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                  normalize
                    ? 'bg-amber-50 border-amber-400 text-amber-700'
                    : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}
              >
                <span className="text-base">{normalize ? '📊' : '📈'}</span>
                <span>
                  {normalize ? t('normalize_on') : t('normalize_off')}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <section className="card space-y-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{t('section_med_tracker')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('med_tracker_subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-2xl bg-gray-100 dark:bg-gray-700/70 p-1.5">
            <button
              type="button"
              onClick={() => setWeekAnchor(current => subWeeks(current, 1))}
              className="w-10 h-10 rounded-xl text-lg text-gray-600 dark:text-gray-300 active:bg-white dark:active:bg-gray-600"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setWeekAnchor(new Date())}
              className="flex-1 min-w-0 px-3 h-10 rounded-xl text-center text-sm font-semibold text-gray-700 dark:text-gray-200 active:bg-white dark:active:bg-gray-600"
            >
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </button>
            <button
              type="button"
              onClick={() => setWeekAnchor(current => addWeeks(current, 1))}
              className="w-10 h-10 rounded-xl text-lg text-gray-600 dark:text-gray-300 active:bg-white dark:active:bg-gray-600"
            >
              ›
            </button>
          </div>
        </div>

        {medicationNames.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
            {t('no_meds_add_first')}
          </div>
        ) : trackerLoading ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
            {t('loading_tracker')}
          </div>
        ) : (
          <div className="space-y-3">
            {medicationNames.map(name => (
              <div
                key={name}
                className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/70 p-3"
              >
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{name}</h3>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {weekDays.filter(day => isMedicationTaken(format(day, 'yyyy-MM-dd'), name)).length}/7
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day, index) => {
                    const date = format(day, 'yyyy-MM-dd')
                    const taken = isMedicationTaken(date, name)
                    const cellKey = `${date}:${name}`
                    const pending = savingCell === cellKey

                    return (
                      <button
                        key={cellKey}
                        type="button"
                        onClick={e => toggleMedicationTaken(date, name, e.currentTarget)}
                        className={`rounded-2xl border px-1 py-2.5 min-h-[72px] flex flex-col items-center justify-center gap-1 text-center transition-all ${taken ? 'border-primary-600 bg-primary-600 text-white shadow-sm' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-300'} ${isToday(day) && !taken ? 'ring-2 ring-primary-200 dark:ring-primary-800' : ''} ${pending ? 'opacity-60' : 'active:scale-[0.98]'}`}
                        aria-pressed={taken}
                        aria-label={`${name} on ${format(day, 'EEEE, MMMM d')}`}
                      >
                        <span className={`text-[10px] font-bold uppercase ${taken ? 'text-primary-100' : 'text-gray-400 dark:text-gray-500'}`}>
                          {t('wd_1char_' + index)}
                        </span>
                        <span className={`text-sm font-semibold ${taken ? 'text-white' : isToday(day) ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-100'}`}>
                          {format(day, 'd')}
                        </span>
                        <span className="text-lg leading-none">{taken ? '✓' : '○'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {medCelebrationBurst && null /* rendered at top level */}
      </section>

      <section className="card space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{t('section_health_trends')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('health_trends_subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {DAY_TREND_OPTIONS.map(option => {
            const isSelected = selectedTrendDayType === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setSelectedTrendDayType(option.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  isSelected
                    ? option.accentClass
                    : `bg-white dark:bg-gray-800 ${option.inactiveClass}`
                }`}
              >
                {t('day_' + option.value)}
              </button>
            )
          })}
        </div>

        {trendSummary.totalDays === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
            {t('no_days_yet', t('day_' + selectedTrendDayType).toLowerCase())}
          </div>
        ) : trendSummary.topTrends.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
            {t('not_enough_detail', t('day_' + selectedTrendDayType))}
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800/70 dark:text-gray-300">
                {t('trend_based_on', trendSummary.totalDays, t('day_' + selectedTrendDayType).toLowerCase(), trendSummary.totalDays === 1 ? '' : 's')}
            </div>

            <div className="space-y-2">
              {trendSummary.topTrends.map((trend, index) => (
                <div
                  key={trend.key}
                  className={`rounded-xl border px-3 py-2.5 ${TREND_TONE_CLASS[trend.tone] || TREND_TONE_CLASS.gray}`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/80 text-base shadow-sm dark:bg-gray-900/40">
                        {trend.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-70">
                          {t('trend_num', index + 1)}
                        </p>
                        <p className="text-sm font-semibold leading-5 text-current">{trend.labelKey ? t(trend.labelKey) : trend.label}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold leading-none text-current">{trend.count}</p>
                      <p className="text-xs opacity-70">{t('trend_pct', trend.percentage)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
    </>
  )
}