import { useState, useEffect, useCallback } from 'react'
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth, isSameDay, isToday,
} from 'date-fns'
import { entriesApi, appearancesApi, metricsApi } from '../../services/api'
import DayCell from './DayCell'
import DailyEntryForm from '../DailyEntry/DailyEntryForm'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export default function CalendarView() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [entries, setEntries] = useState({})       // keyed by "YYYY-MM-DD"
  const [appearances, setAppearances] = useState({})
  const [metrics, setMetrics] = useState([])
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(false)

  const year  = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1

  const loadMonthData = useCallback(async () => {
    setLoading(true)
    try {
      const [entriesArr, appearancesArr, metricsArr] = await Promise.all([
        entriesApi.getByMonth(year, month),
        appearancesApi.getByMonth(year, month),
        metricsApi.getAll(),
      ])

      const eMap = {}
      entriesArr.forEach(e => { eMap[e.date] = e })
      setEntries(eMap)

      const aMap = {}
      appearancesArr.forEach(a => { aMap[a.date] = a })
      setAppearances(aMap)

      setMetrics(metricsArr)
    } catch (err) {
      console.error('Failed to load month data', err)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { loadMonthData() }, [loadMonthData])

  // Build full 6-row grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd   = endOfMonth(currentMonth)
  const gridStart  = startOfWeek(monthStart)
  const gridEnd    = endOfWeek(monthEnd)
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-2">
      {/* Compact mobile header */}
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

      {/* Calendar grid — fills all remaining space */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col flex-1 min-h-0"
      >
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
          {WEEKDAYS.map((day, i) => (
            <div
              key={i}
              className="py-2 text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">Loading…</div>
        ) : (
          <div
            className="grid grid-cols-7 flex-1"
            style={{ gridTemplateRows: `repeat(${days.length / 7}, 1fr)` }}
          >
            {days.map((day, idx) => {
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
                  isLast={idx >= days.length - 7}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Daily entry — bottom sheet */}
      {selectedDate && (
        <>
          <div className="sheet-backdrop" onClick={() => setSelectedDate(null)} />
          <div className="sheet">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <DailyEntryForm
              date={selectedDate}
              entry={entries[format(selectedDate, 'yyyy-MM-dd')]}
              appearance={appearances[format(selectedDate, 'yyyy-MM-dd')]}
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
