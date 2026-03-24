import { format } from 'date-fns'
import clsx from 'clsx'

// Returns 'text-white' or 'text-gray-900' based on perceived luminance of a hex color
function contrastText(hex) {
  if (!hex) return 'text-gray-700'
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  // Perceived luminance formula (WCAG)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? 'text-gray-900' : 'text-white'
}

export default function DayCell({
  day,
  isCurrentMonth,
  isToday,
  isSelected,
  entry,
  appearance,
  metrics,
  onClick,
  isLast,
}) {
  const dateStr  = format(day, 'd')
  const hasEntry = !!entry && entry.values?.length > 0
  const bgColor  = appearance?.color || null
  const emoji    = appearance?.emoji || null
  const hasNotes = !!entry?.notes

  const dots = hasEntry
    ? entry.values
        .slice(0, 3)
        .map(v => {
          const metric = metrics.find(m => m.id === v.metricId)
          return metric ? { color: metric.color || '#22c55e', name: metric.name } : null
        })
        .filter(Boolean)
    : []

  return (
    <button
      onClick={onClick}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
      className={clsx(
        'relative w-full h-full flex flex-col items-center justify-start pt-2 border-b border-r border-gray-100 dark:border-gray-700',
        'focus:outline-none active:brightness-95 transition-all',
        !isCurrentMonth && 'opacity-30',
        isSelected && 'ring-2 ring-inset ring-primary-500 bg-primary-50 dark:bg-primary-900/30',
        !isSelected && !bgColor && 'active:bg-gray-100 dark:active:bg-gray-700',
      )}
    >
      {/* Day number */}
      <span
        className={clsx(
          'w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold',
          isToday
            ? 'bg-primary-600 text-white'
            : bgColor
              ? contrastText(bgColor)   // auto black/white based on luminance
              : 'text-gray-700 dark:text-gray-200',
        )}
      >
        {dateStr}
      </span>

      {/* Emoji */}
      {emoji && (
        <span className="text-base leading-none mt-0.5">{emoji}</span>
      )}

      {/* Metric dots */}
      {dots.length > 0 && (
        <div className="flex gap-[3px] mt-0.5">
          {dots.map((dot, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: dot.color }}
            />
          ))}
          {hasNotes && (
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          )}
        </div>
      )}
    </button>
  )
}
