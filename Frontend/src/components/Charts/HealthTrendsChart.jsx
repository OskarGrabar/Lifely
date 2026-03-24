import { useState, useEffect, useMemo } from 'react'
import { format, subDays } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import { metricsApi, entriesApi } from '../../services/api'

const RANGE_OPTIONS = [
  { label: '1W',  days: 7   },
  { label: '2W',  days: 14  },
  { label: '1M',  days: 30  },
  { label: '3M',  days: 90  },
  { label: '6M',  days: 180 },
]

export default function HealthTrendsChart() {
  const [allMetrics, setAllMetrics]   = useState([])
  const [entries, setEntries]         = useState([])
  const [selected, setSelected]       = useState([])
  const [range, setRange]             = useState(30)
  const [loading, setLoading]         = useState(false)
  const [normalize, setNormalize]     = useState(false)

  const chartableMetrics = useMemo(
    () => allMetrics.filter(m => !m.calendarOnly),
    [allMetrics]
  )

  useEffect(() => {
    metricsApi.getAll().then(data => {
      setAllMetrics(data)
      const chartable = data.filter(m => !m.calendarOnly)
      setSelected(chartable.slice(0, 3).map(m => m.id))
    })
  }, [])

  useEffect(() => {
    const end   = format(new Date(), 'yyyy-MM-dd')
    const start = format(subDays(new Date(), range), 'yyyy-MM-dd')
    setLoading(true)
    entriesApi.getRange(start, end)
      .then(setEntries)
      .finally(() => setLoading(false))
  }, [range])

  // Build raw chart rows
  const rawData = useMemo(() => {
    const byDate = {}
    entries.forEach(entry => {
      byDate[entry.date] = byDate[entry.date] || {}
      entry.values.forEach(v => {
        const metric = allMetrics.find(m => m.id === v.metricId)
        if (!metric || metric.calendarOnly) return
        const num = parseFloat(v.value)
        if (!isNaN(num))            byDate[entry.date][v.metricId] = num
        else if (v.value === 'Yes') byDate[entry.date][v.metricId] = 1
        else if (v.value === 'No')  byDate[entry.date][v.metricId] = 0
      })
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => {
        // Explicitly set null for any selected metric not logged that day
        // so Recharts treats it as missing rather than 0
        const row = { date }
        selected.forEach(id => {
          row[id] = vals[id] !== undefined ? vals[id] : null
        })
        return row
      })
  }, [entries, allMetrics, selected])

  // When normalize is on, scale every metric to 0–100% of its own maximum
  const chartData = useMemo(() => {
    if (!normalize) return rawData
    // Find per-metric max across visible data
    const maxMap = {}
    selected.forEach(id => {
      const vals = rawData.map(d => d[id]).filter(v => v !== null && v !== undefined)
      if (!vals.length) return
      maxMap[id] = Math.max(...vals) || 1
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

  // For tooltip — map back to original value
  const originalData = useMemo(() => {
    const map = {}
    rawData.forEach(row => { map[row.date] = row })
    return map
  }, [rawData])

  const toggleMetric = id =>
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Health Trends</h1>

      {/* Range pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-none">
        {RANGE_OPTIONS.map(opt => (
          <button
            key={opt.days}
            onClick={() => setRange(opt.days)}
            className={`flex-shrink-0 px-5 py-2 text-sm rounded-full font-medium transition-colors ${
              range === opt.days
                ? 'bg-primary-600 text-white'
                : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 active:bg-gray-50 dark:active:bg-gray-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Metric toggles + normalize button */}
      {chartableMetrics.length > 0 && (
        <div className="card py-3 space-y-3">
          <div className="flex flex-wrap gap-2">
            {chartableMetrics.map(m => {
              const isOn = selected.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMetric(m.id)}
                  className={`px-3 py-2 text-sm rounded-full font-medium border transition-all min-h-[36px] ${
                    isOn ? 'text-white border-transparent' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                  }`}
                  style={isOn ? { backgroundColor: m.color || '#22c55e', borderColor: m.color || '#22c55e' } : {}}
                >
                  {m.name}
                  {m.unit && <span className="ml-1 opacity-70">({m.unit})</span>}
                </button>
              )
            })}
          </div>

          {/* Normalize toggle — helps compare metrics with different scales */}
          {selected.length > 1 && (
            <button
              type="button"
              onClick={() => setNormalize(n => !n)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-colors w-full ${
                normalize
                  ? 'bg-amber-50 border-amber-400 text-amber-700'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
              }`}
            >
              <span className="text-base">{normalize ? '📊' : '📈'}</span>
              <span>
                {normalize
                  ? 'Comparing as % of each metric’s highest value — tap to show real values'
                  : 'Metrics hard to compare? Tap to normalize to %'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="card">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-gray-400">Loading…</div>
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm text-center px-4">
            No data for this period. Start logging on the Calendar.
          </div>
        ) : selected.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm text-center px-4">
            Tap a metric above to plot it.
          </div>
        ) : (
          <>
            {normalize && (
              <p className="text-xs text-amber-600 text-center mb-2">Showing % of each metric’s highest recorded value</p>
            )}
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => format(new Date(d + 'T00:00:00'), 'MMM d')}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  width={normalize ? 36 : 30}
                  tickFormatter={v => normalize ? `${v}%` : v}
                  domain={normalize ? [0, 100] : ['auto', 'auto']}
                />
                <Tooltip
                  labelFormatter={label => format(new Date(label + 'T00:00:00'), 'MMM d, yyyy')}
                  formatter={(value, name, props) => {
                    const metric = allMetrics.find(m => String(m.id) === String(name))
                    if (normalize && value !== null) {
                      const orig = originalData[props.payload?.date]?.[name]
                      return [
                        `${value}%${orig !== null && orig !== undefined ? ` (${orig}${metric?.unit ? ' ' + metric.unit : ''})` : ''}`,
                        metric?.name || name,
                      ]
                    }
                    return [`${value}${metric?.unit ? ' ' + metric.unit : ''}`, metric?.name || name]
                  }}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={name => {
                    const metric = allMetrics.find(m => String(m.id) === String(name))
                    return metric?.name || name
                  }}
                />
                {selected.map(id => {
                  const m = allMetrics.find(x => x.id === id)
                  return m ? (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={id}
                      stroke={m.color || '#22c55e'}
                      strokeWidth={2}
                      dot={{ r: 2 }}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  ) : null
                })}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  )
}


