import { useMemo } from 'react'
import { format } from 'date-fns'
import clsx from 'clsx'

function parseHexColor(hex) {
  if (!hex) return null
  const normalized = hex.replace('#', '')
  const expanded = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized

  const r = parseInt(expanded.slice(0, 2), 16)
  const g = parseInt(expanded.slice(2, 4), 16)
  const b = parseInt(expanded.slice(4, 6), 16)

  if ([r, g, b].some(Number.isNaN)) return null
  return { r, g, b }
}

function toRgba(color, alpha) {
  const rgb = typeof color === 'string' ? parseHexColor(color) : color
  if (!rgb) return undefined
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map(value => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0'))
    .join('')}`
}

function shiftHexColor(hex, amount) {
  const rgb = parseHexColor(hex)
  if (!rgb) return hex

  return rgbToHex({
    r: rgb.r + amount,
    g: rgb.g + amount,
    b: rgb.b + amount,
  })
}

function contrastText(hex) {
  if (!hex) return 'text-gray-700'
  const rgb = parseHexColor(hex)
  if (!rgb) return 'text-gray-700'
  const { r, g, b } = rgb
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
}) {
  const dateStr  = format(day, 'd')
  const hasEntry = !!entry && entry.values?.length > 0
  const bgColor  = appearance?.color || null
  const emoji    = appearance?.emoji || null
  const hasNotes = !!entry?.notes
  const metricColorsById = useMemo(
    () => new Map(metrics.map(metric => [metric.id, metric.color || '#22c55e'])),
    [metrics]
  )
  const { badgeColor, badgeTextClass, coloredBadgeStyle } = useMemo(() => {
    if (!bgColor) {
      return {
        badgeColor: null,
        badgeTextClass: 'text-gray-700 dark:text-gray-200',
        coloredBadgeStyle: undefined,
      }
    }

    const nextBadgeColor = contrastText(bgColor) === 'text-gray-900'
      ? shiftHexColor(bgColor, -34)
      : shiftHexColor(bgColor, 34)

    return {
      badgeColor: nextBadgeColor,
      badgeTextClass: contrastText(nextBadgeColor),
      coloredBadgeStyle: {
        backgroundColor: nextBadgeColor,
        boxShadow: `inset 0 0 0 1px ${toRgba(nextBadgeColor, 0.42)}`,
      },
    }
  }, [bgColor])

  const indicatorDots = useMemo(() => {
    const metricDots = hasEntry
      ? entry.values
          .map(value => {
            const color = metricColorsById.get(value.metricId)
            return color ? { color } : null
          })
          .filter(Boolean)
      : []

    return [
      ...metricDots,
      ...(hasNotes ? [{ color: '#facc15' }] : []),
    ].slice(0, 3)
  }, [entry, hasEntry, hasNotes, metricColorsById])

  return (
    <button
      onClick={onClick}
      style={bgColor ? { backgroundColor: bgColor } : undefined}
      className={clsx(
        'relative w-full h-full min-h-0 flex flex-col items-center justify-start rounded-[20px] px-1 pt-1.5 pb-1.5',
        'focus:outline-none transition-all duration-200 ease-out shadow-sm',
        !isCurrentMonth && 'opacity-35',
        bgColor
          ? 'active:brightness-95'
          : 'bg-gray-50 dark:bg-gray-700/45 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-700',
        isSelected && 'ring-2 ring-primary-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 shadow-[0_10px_22px_-18px_rgba(34,197,94,0.9)]',
        !isSelected && 'border border-transparent',
      )}
    >
      {/* Day number */}
      <span
        style={!isToday && bgColor ? coloredBadgeStyle : undefined}
        className={clsx(
          'flex items-center justify-center rounded-full font-semibold',
          'w-8 h-8 text-sm',
          isToday
            ? 'bg-primary-600 text-white'
            : bgColor
              ? clsx(badgeTextClass, 'shadow-sm')
              : 'bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-200',
        )}
      >
        {dateStr}
      </span>

      {emoji && (
        <div className="mt-1 text-lg leading-none" aria-hidden="true">
          {emoji}
        </div>
      )}

      {/* Metric dots */}
      {indicatorDots.length > 0 && (
        <div className="mt-1 max-w-full self-center rounded-full bg-white/70 dark:bg-gray-800/70 px-1 py-0.5">
          <div className="flex items-center justify-center gap-1 min-w-0">
          {indicatorDots.map((dot, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: dot.color }}
            />
          ))}
          </div>
        </div>
      )}
    </button>
  )
}
