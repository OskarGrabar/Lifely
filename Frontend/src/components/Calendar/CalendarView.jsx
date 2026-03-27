import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay, isToday,
} from 'date-fns'
import { entriesApi, appearancesApi, metricsApi } from '../../services/api'
import DayCell from './DayCell'
import DailyEntryForm from '../DailyEntry/DailyEntryForm'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function CalendarView() {
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [entries, setEntries] = useState({})
  const [appearances, setAppearances] = useState({})
  const [metrics, setMetrics] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(false)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1
  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const todayEntry = entries[todayKey]
  const hasStartedDailyCheckIn = Boolean(
    todayEntry?.overallDay || todayEntry?.sleepToday || todayEntry?.foodToday || todayEntry?.stressToday || todayEntry?.activityToday
  )
  const hasSubmittedDailyCheckIn = Boolean(todayEntry?.dailyCheckInCompleted)
  const dailyCheckInTitle = hasSubmittedDailyCheckIn
    ? 'You Have Submitted Your Daily Check-In'
    : hasStartedDailyCheckIn
      ? 'Continue Your Daily Check-In'
      : 'Start Your Daily Check-In'
  const dailyCheckInButtonLabel = hasSubmittedDailyCheckIn
    ? 'You have submitted your daily check-in'
    : hasStartedDailyCheckIn
      ? 'Continue your daily check-in'
      : 'Start your daily check-in'
  const dailyCheckInHelperText = hasSubmittedDailyCheckIn
    ? 'Today is already submitted. You can reopen it if you want to review or change it.'
    : hasStartedDailyCheckIn
      ? 'Pick up where you left off on the dedicated page.'
      : 'Tap to continue to the dedicated page.'
  const dailyCheckInHeaderClass = 'border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
  const dailyCheckInEyebrowClass = hasSubmittedDailyCheckIn
    ? 'text-primary-600 dark:text-primary-400'
    : hasStartedDailyCheckIn
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-sky-600 dark:text-sky-400'
  const dailyCheckInButtonClass = hasSubmittedDailyCheckIn
    ? 'border-primary-200 bg-primary-50 active:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/20 dark:active:bg-primary-900/30'
    : hasStartedDailyCheckIn
      ? 'border-amber-200 bg-amber-50 active:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/20 dark:active:bg-amber-900/30'
      : 'border-sky-200 bg-sky-50 active:bg-sky-100 dark:border-sky-800 dark:bg-sky-900/20 dark:active:bg-sky-900/30'
  const dailyCheckInButtonTextClass = hasSubmittedDailyCheckIn
    ? 'text-primary-700 dark:text-primary-300'
    : hasStartedDailyCheckIn
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-sky-700 dark:text-sky-300'
  const dailyCheckInHelperClass = hasSubmittedDailyCheckIn
    ? 'text-gray-600 dark:text-gray-400'
    : hasStartedDailyCheckIn
      ? 'text-gray-600 dark:text-gray-400'
      : 'text-gray-600 dark:text-gray-400'

  useEffect(() => {
    metricsApi.getAll().then(setMetrics)
  }, [])

  const loadMonthData = useCallback(async () => {
    setLoading(true)
    try {
      const [entriesArr, appearancesArr] = await Promise.all([
        entriesApi.getByMonth(year, month),
        appearancesApi.getByMonth(year, month),
      ])

      const nextEntries = {}
      entriesArr.forEach(entry => {
        nextEntries[entry.date] = entry
      })
      setEntries(nextEntries)

      const nextAppearances = {}
      appearancesArr.forEach(appearance => {
        nextAppearances[appearance.date] = appearance
      })
      setAppearances(nextAppearances)
    } catch (err) {
      console.error('Failed to load month data', err)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    loadMonthData()
  }, [loadMonthData])

  useEffect(() => {
    window.addEventListener('entries-changed', loadMonthData)
    return () => window.removeEventListener('entries-changed', loadMonthData)
  }, [loadMonthData])

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
  const rowCount = days.length / 7
  const rowHeightRem = 4.75

  return (
    <div className="space-y-3 pb-6">
      <div className="flex items-center justify-between px-1 py-1">
        <button
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-200 dark:active:bg-gray-700 text-gray-600 dark:text-gray-300 text-xl"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          ‹
        </button>

        <button
          className="flex-1 text-center"
          onClick={() => setCurrentMonth(new Date())}
        >
          <span className="text-base font-bold text-gray-800 dark:text-gray-100">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
        </button>

        <button
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-200 dark:active:bg-gray-700 text-gray-600 dark:text-gray-300 text-xl"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          ›
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[26px] border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col flex-none p-2 gap-2">
        <div className="grid grid-cols-7 gap-1.5 flex-shrink-0">
          {WEEKDAYS.map((day, index) => (
            <div
              key={index}
              className="rounded-full bg-gray-50 dark:bg-gray-700/60 py-1.5 text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {loading ? (
          <div
            className="flex items-center justify-center text-gray-400 dark:text-gray-500"
            style={{ minHeight: `${rowCount * rowHeightRem}rem` }}
          >
            Loading…
          </div>
        ) : (
          <div
            className="grid grid-cols-7 gap-1.5"
            style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, ${rowHeightRem}rem))` }}
          >
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd')
              return (
                <DayCell
                  key={key}
                  day={day}
                  isCurrentMonth={isSameMonth(day, currentMonth)}
                  isToday={isToday(day)}
                  isSelected={selectedDate ? isSameDay(day, selectedDate) : false}
                  entry={entries[key]}
                  appearance={appearances[key]}
                  metrics={metrics}
                  onClick={() => setSelectedDate(isSameDay(day, selectedDate) ? null : day)}
                />
              )
            })}
          </div>
        )}
      </div>

      <section className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className={`border-b px-4 py-4 ${dailyCheckInHeaderClass}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dailyCheckInEyebrowClass}`}>Daily Check-In</p>
              <h2 className="mt-1 text-base font-bold text-gray-800 dark:text-gray-100">{dailyCheckInTitle}</h2>
              
            </div>
          </div>
        </div>

        <div className="p-4">
          <button
            type="button"
            onClick={() => navigate('/daily-check-in')}
            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-colors ${dailyCheckInButtonClass}`}
          >
            <div>
              <p className={`text-sm font-semibold ${dailyCheckInButtonTextClass}`}>{dailyCheckInButtonLabel}</p>
              <p className={`mt-1 text-xs ${dailyCheckInHelperClass}`}>{dailyCheckInHelperText}</p>
            </div>
            <span className={`text-xl ${dailyCheckInButtonTextClass}`}>›</span>
          </button>
        </div>
      </section>

      {selectedDate && (
        <>
          <div className="sheet-backdrop" onClick={() => setSelectedDate(null)} />
          <div className="sheet">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <DailyEntryForm
              date={selectedDate}
              entry={entries[selectedDateKey]}
              appearance={appearances[selectedDateKey]}
              metrics={metrics}
              onSaved={loadMonthData}
              onClose={() => setSelectedDate(null)}
            />
          </div>
        </>
      )}
    </div>
  )
}
