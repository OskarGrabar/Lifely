import { useRef, useCallback, useEffect } from 'react'

const ITEM_H  = 52
const VISIBLE = 5
const PAD     = ITEM_H * Math.floor(VISIBLE / 2)   // 2 rows of padding top & bottom

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function Wheel({ items, value, onChange }) {
  const ref         = useRef(null)
  const touching    = useRef(false)   // true while finger is on screen
  const settleTimer = useRef(null)
  const prevValue   = useRef(value)   // tracks last value WE committed

  const scrollTo = (idx, smooth = true) => {
    ref.current?.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'instant' })
  }
  const idxOf = (v) => items.indexOf(v)

  // Jump to initial position on mount
  useEffect(() => {
    scrollTo(idxOf(value), false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When value changes from OUTSIDE parent, scroll to match
  useEffect(() => {
    if (value === prevValue.current) return   // we caused this — skip
    if (touching.current) return              // user is mid-swipe — skip
    prevValue.current = value
    scrollTo(idxOf(value), true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const onTouchStart = useCallback(() => { touching.current = true }, [])
  const onTouchEnd   = useCallback(() => {
    setTimeout(() => { touching.current = false }, 400)
  }, [])

  const onScroll = useCallback(() => {
    clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      const el = ref.current
      if (!el) return
      const idx    = Math.round(el.scrollTop / ITEM_H)
      const clamped = Math.max(0, Math.min(items.length - 1, idx))
      const picked  = items[clamped]
      if (picked !== prevValue.current) {
        prevValue.current = picked
        onChange(picked)
      }
    }, 80)
  }, [items, onChange])

  return (
    <div
      className="relative overflow-hidden select-none"
      style={{ height: ITEM_H * VISIBLE, width: 80 }}
    >
      {/* Z=0 — highlight band, sits BEHIND the list */}
      <div
        className="absolute inset-x-2 rounded-xl bg-gray-100 dark:bg-gray-700
                   border-t border-b border-gray-200 dark:border-gray-600 pointer-events-none"
        style={{ top: PAD, height: ITEM_H, zIndex: 0 }}
      />

      {/* Z=1 — scrollable list */}
      <div
        ref={ref}
        onScroll={onScroll}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="absolute inset-0 overflow-y-scroll overscroll-contain"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          zIndex: 1,
        }}
      >
        <div style={{ height: PAD }} aria-hidden="true" />
        {items.map((item) => (
          <div
            key={item}
            style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
            className="flex items-center justify-center"
          >
            <span className={`text-3xl tabular-nums leading-none transition-all duration-100 ${
              item === value
                ? 'font-semibold text-primary-600 dark:text-primary-400 scale-105'
                : 'font-light text-gray-400 dark:text-gray-500 scale-100'
            }`}>
              {item}
            </span>
          </div>
        ))}
        <div style={{ height: PAD }} aria-hidden="true" />
      </div>

      {/* Z=2 — fade masks, sit ON TOP of the list */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none
                   bg-gradient-to-b from-white dark:from-gray-800 to-transparent"
        style={{ height: PAD + 12, zIndex: 2 }}
      />
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none
                   bg-gradient-to-t from-white dark:from-gray-800 to-transparent"
        style={{ height: PAD + 12, zIndex: 2 }}
      />
    </div>
  )
}

const HIDE_SCROLLBAR = `[data-wheel] div::-webkit-scrollbar { display: none; }`

export default function TimeWheelPicker({ value, onChange }) {
  const [hh, mm] = value.split(':')
  return (
    <>
      <style>{HIDE_SCROLLBAR}</style>
      <div data-wheel className="flex items-center justify-center gap-1 py-2">
        <Wheel items={HOURS}   value={hh} onChange={(h) => onChange(`${h}:${mm}`)} />
        <span className="text-3xl font-bold text-gray-600 dark:text-gray-300 pb-1 select-none">:</span>
        <Wheel items={MINUTES} value={mm} onChange={(m) => onChange(`${hh}:${m}`)} />
      </div>
    </>
  )
}
