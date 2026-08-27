import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTutorial } from '../../context/TutorialContext'
import { useLocaleContext } from '../../context/LocaleContext'

const LANGUAGES = [
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'pl', label: 'Polski',   flag: '🇵🇱' },
  { code: 'sv', label: 'Svenska',  flag: '🇸🇪' },
  { code: 'es', label: 'Español',  flag: '🇪🇸' },
]

const DARK = 'rgba(0,0,0,0.72)'
const PAD  = 10
const R    = 18

// Each spotlight step: route, selector, tooltip pos.
// action:true steps ask the user to tap through the spotlight & press "Done" when done.
const STEPS = [
  { type: 'language' },

  // 1 — Calendar overview
  {
    type: 'spotlight',
    route: '/calendar',
    selector: '[data-tutorial="calendar-header"]',
    titleKey: 'tut_calendar_title',
    bodyKey:  'tut_calendar_body',
    pos: 'bottom',
  },

  // 2 — Tap today to explore the day editor
  {
    type: 'spotlight',
    route: '/calendar',
    selector: '[data-tutorial="today-cell"]',
    titleKey: 'tut_tap_today_title',
    bodyKey:  'tut_tap_today_body',
    pos: 'bottom',
  },

  // 3 — Explain daily check-in card
  {
    type: 'spotlight',
    route: '/calendar',
    selector: '[data-tutorial="checkin-card"]',
    titleKey: 'tut_checkin_title',
    bodyKey:  'tut_checkin_body',
    pos: 'top',
  },

  // 4 — Explore the check-in form (user navigates away then returns)
  {
    type: 'spotlight',
    route: '/calendar',
    selector: '[data-tutorial="checkin-card"]',
    titleKey: 'tut_do_checkin_title',
    bodyKey:  'tut_do_checkin_body',
    pos: 'top',
    allowNavigate: true,
  },

  // 5 — Trends chart
  {
    type: 'spotlight',
    route: '/trends',
    selector: '[data-tutorial="trends-chart"]',
    titleKey: 'tut_trends_title',
    bodyKey:  'tut_trends_body',
    pos: 'bottom',
  },

  // 6 — Alarms overview
  {
    type: 'spotlight',
    route: '/alarms',
    selector: '[data-tutorial="alarms-header"]',
    titleKey: 'tut_alarms_title',
    bodyKey:  'tut_alarms_body',
    pos: 'bottom',
  },

  // 7 — Explore the alarm editor
  {
    type: 'spotlight',
    route: '/alarms',
    selector: '[data-tutorial="add-alarm-btn"]',
    titleKey: 'tut_add_alarm_title',
    bodyKey:  'tut_add_alarm_body',
    pos: 'bottom',
  },

  // 8 — Goals & Habits overview
  {
    type: 'spotlight',
    route: '/goals-habits',
    selector: '[data-tutorial="goals-section"]',
    titleKey: 'tut_goals_title',
    bodyKey:  'tut_goals_body',
    pos: 'bottom',
  },

  // 9 — Explore the habit editor
  {
    type: 'spotlight',
    route: '/goals-habits',
    selector: '[data-tutorial="add-habit-btn"]',
    titleKey: 'tut_add_habit_title',
    bodyKey:  'tut_add_habit_body',
    pos: 'bottom',
  },

  // 10 — Customise appearance
  {
    type: 'spotlight',
    route: '/metrics',
    selector: '[data-tutorial="settings-customise"]',
    titleKey: 'tut_customise_title',
    bodyKey:  'tut_customise_body',
    pos: 'bottom',
  },

  // 11 — Done
  { type: 'done' },
]

const SPOTLIGHT_STEPS = STEPS.filter(s => s.type === 'spotlight')

export default function TutorialOverlay() {
  const { active, step, next, back, skip, complete } = useTutorial()
  const { t, lang, setLang } = useLocaleContext()
  const navigate  = useNavigate()
  const location  = useLocation()

  const [rect,  setRect]  = useState(null)
  const [ready, setReady] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const currentStep = STEPS[Math.min(step, STEPS.length - 1)]
  const isLastStep  = step === STEPS.length - 1

  // 1-based counter among spotlight-only steps
  const spotlightIdx = STEPS.slice(0, step + 1).filter(s => s.type === 'spotlight').length

  const measure = useCallback(() => {
    if (currentStep.type !== 'spotlight') return
    const el = document.querySelector(currentStep.selector)
    if (!el) { setRect(null); setReady(false); return }
    // Scroll the target into view, centred vertically so it clears the BottomNav
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setTimeout(() => {
      const r = el.getBoundingClientRect()
      setRect(r)
      setReady(true)
    }, 350)
  }, [currentStep])

  useEffect(() => {
    if (!active || currentStep.type !== 'spotlight') { setReady(false); return }
    setReady(false)
    setRect(null)
    if (location.pathname !== currentStep.route) {
      // allowNavigate steps let the user visit a linked page and return freely
      if (!currentStep.allowNavigate) navigate(currentStep.route)
      return
    }
    const id = setTimeout(measure, 250)
    return () => clearTimeout(id)
  }, [step, location.pathname, active]) // eslint-disable-line

  useEffect(() => {
    if (!active || !ready) return
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active, ready, measure])

  // Hide overlay while any sheet/popup portal is open; re-appear when it closes
  useEffect(() => {
    if (!active) return
    const check = () => {
      const extra = Array.from(document.body.children).some(
        el => el.tagName === 'DIV' && el.id !== 'root' && el.getAttribute('data-tut') !== '1'
      )
      setSheetOpen(extra)
    }
    const observer = new MutationObserver(check)
    observer.observe(document.body, { childList: true })
    return () => { observer.disconnect(); setSheetOpen(false) }
  }, [active])

  // Re-measure spotlight target after a sheet closes (target may have shifted)
  useEffect(() => {
    if (!active || sheetOpen) return
    if (currentStep.type !== 'spotlight') return
    if (location.pathname !== currentStep.route) return
    const id = setTimeout(measure, 200)
    return () => clearTimeout(id)
  }, [sheetOpen]) // eslint-disable-line

  if (!active) return null

  // Language picker
  if (currentStep.type === 'language') {
    return createPortal(
      <div
        data-tut="1"
        className="fixed inset-0 z-[200] flex flex-col"
        style={{
          backgroundColor: 'var(--bg-card)',
          paddingTop:    'max(env(safe-area-inset-top), 2rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
        }}
      >
        <div className="flex justify-end px-5 pb-2">
          <button onClick={skip} className="text-sm font-medium text-gray-400 active:text-gray-600 px-2 py-1">
            {t('tut_skip')}
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
          <div className="w-24 h-24 rounded-[1.75rem] bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <span className="text-5xl">🌍</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{t('tut_lang_title')}</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('tut_lang_sub')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full">
            {LANGUAGES.map(({ code, label, flag }) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-4 transition-all active:scale-95 ${
                  lang === code
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <span className="text-2xl">{flag}</span>
                <span className={`text-sm font-semibold ${
                  lang === code ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200'
                }`}>{label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="px-6 pt-4">
          <button onClick={next} className="w-full h-12 rounded-2xl bg-primary-500 active:bg-primary-600 text-white font-bold text-sm">
            {t('tut_next')} →
          </button>
        </div>
      </div>,
      document.body
    )
  }

  // Done screen
  if (currentStep.type === 'done') {
    return createPortal(
      <div
        data-tut="1"
        className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-8 px-6"
        style={{
          backgroundColor: 'rgba(0,0,0,0.82)',
          paddingTop:    'max(env(safe-area-inset-top), 2rem)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
        }}
      >
        <div className="w-28 h-28 rounded-[2rem] bg-white/10 flex items-center justify-center">
          <span className="text-6xl">🎉</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">{t('tut_done_title')}</h1>
          <p className="mt-3 text-[15px] text-white/70 leading-relaxed">{t('tut_done_body')}</p>
        </div>
        <button onClick={complete} className="w-full h-14 rounded-2xl bg-primary-500 active:bg-primary-600 text-white font-bold text-base">
          {t('tut_finish')}
        </button>
      </div>,
      document.body
    )
  }

  // Spotlight step
  if (sheetOpen) return null   // hide entirely while a sheet/modal is open
  if (!ready || !rect) return null

  const sRect = {
    left:   rect.left   - PAD,
    top:    rect.top    - PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  }

  const tooltipAbove = currentStep.pos === 'top' || rect.top > window.innerHeight * 0.52
  const tooltipMaxHeight = tooltipAbove
    ? Math.max(180, sRect.top - 20)
    : Math.max(180, window.innerHeight - (sRect.top + sRect.height + 14) - 90)
  const tooltipFixedStyle = tooltipAbove
    ? { position: 'fixed', bottom: window.innerHeight - sRect.top + 14, left: '1rem', right: '1rem', zIndex: 80, maxHeight: tooltipMaxHeight, display: 'flex', flexDirection: 'column' }
    : { position: 'fixed', top: sRect.top + sRect.height + 14, left: '1rem', right: '1rem', zIndex: 80, maxHeight: tooltipMaxHeight, display: 'flex', flexDirection: 'column' }

  return createPortal(
    <div data-tut="1">
      {/* Dark overlay with rounded-rect hole + invisible click-blockers at z-31 */}
      <div className="fixed inset-0 z-[31]" style={{ pointerEvents: 'none' }}>
        {/* SVG renders the dark surround with a perfectly rounded hole */}
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <mask id="tut-hole">
              <rect width="100%" height="100%" fill="white" />
              <rect x={sRect.left} y={sRect.top} width={sRect.width} height={sRect.height} rx={R} ry={R} fill="black" />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill={DARK} mask="url(#tut-hole)" />
        </svg>
        {/* Invisible strips block taps outside the spotlight */}
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: sRect.top, pointerEvents: 'all' }} />
        <div style={{ position: 'absolute', left: 0, top: sRect.top + sRect.height, right: 0, bottom: 0, pointerEvents: 'all' }} />
        <div style={{ position: 'absolute', left: 0, top: sRect.top, width: sRect.left, height: sRect.height, pointerEvents: 'all' }} />
        <div style={{ position: 'absolute', left: sRect.left + sRect.width, top: sRect.top, right: 0, height: sRect.height, pointerEvents: 'all' }} />
        {/* Pulsing ring sits on top of the hole */}
        <div className="tut-ring" style={{ position: 'absolute', left: sRect.left, top: sRect.top, width: sRect.width, height: sRect.height, borderRadius: R, pointerEvents: 'none' }} />
      </div>

      {/* Tooltip card: z-80, always above sheets (max z-70) */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden" style={tooltipFixedStyle}>
        {/* Arrow */}
        <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${
          tooltipAbove
            ? 'bottom-[-10px] border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-white dark:border-t-gray-900'
            : 'top-[-10px] border-l-[10px] border-r-[10px] border-b-[10px] border-l-transparent border-r-transparent border-b-white dark:border-b-gray-900'
        }`} />

        {/* Scrollable content area */}
        <div className="overflow-y-auto px-5 pt-4 pb-3" style={{ flex: '1 1 auto', minHeight: 0 }}>
          <div className="flex items-start justify-between gap-4 mb-1">
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{t(currentStep.titleKey)}</h3>
            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 whitespace-nowrap pt-0.5">
              {spotlightIdx} / {SPOTLIGHT_STEPS.length}
            </span>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {t(currentStep.bodyKey)}
          </p>
        </div>

        {/* Pinned button bar — always visible */}
        <div className="flex items-center gap-2 px-5 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800" style={{ flexShrink: 0 }}>
          {step > 1 && (
            <button onClick={back} className="h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800">
              {t('tut_back')}
            </button>
          )}
          <button onClick={next} className="flex-1 h-10 rounded-xl bg-primary-500 active:bg-primary-600 text-white text-sm font-bold">
            {isLastStep ? t('tut_finish') : t('tut_next')}
          </button>
          <button onClick={skip} className="h-10 px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 active:text-gray-600">
            {t('tut_skip')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
