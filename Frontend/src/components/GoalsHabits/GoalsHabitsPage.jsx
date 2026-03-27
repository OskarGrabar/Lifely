import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDays,
  eachDayOfInterval,
  format,
  isToday,
  subDays,
} from 'date-fns'
import { goalsApi, habitsApi, habitTrackerApi } from '../../services/localStore'

const MOTIVATION_LINES = [
  'Small steps still move your life forward.',
  'Consistency beats intensity when you are building something real.',
  'You do not need a perfect day to make meaningful progress.',
  'Keep the promise you made to yourself today.',
  'The version of you in a month will thank you for starting now.',
]

const GOAL_SUGGESTIONS = [
  'Drink enough water every day',
  'Go for a 20 minute walk',
  'Be in bed before 11:00 PM',
  'Take my medication consistently',
  'Stretch for 10 minutes daily',
]

function randomMotivation() {
  return MOTIVATION_LINES[Math.floor(Math.random() * MOTIVATION_LINES.length)]
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const CONFETTI_PARTICLES = [
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

const GOAL_CONFETTI_PARTICLES = [
  ...CONFETTI_PARTICLES,
  { x: -160, y: -260, rotate: -52, color: '#fb7185', delay: '25ms' },
  { x: -142, y: -118, rotate: -36, color: '#f97316', delay: '85ms' },
  { x: -96, y: -286, rotate: -12, color: '#22c55e', delay: '45ms' },
  { x: -58, y: -124, rotate: 8, color: '#38bdf8', delay: '140ms' },
  { x: -18, y: -318, rotate: 18, color: '#fde047', delay: '10ms' },
  { x: 18, y: -304, rotate: -8, color: '#f59e0b', delay: '75ms' },
  { x: 64, y: -128, rotate: 16, color: '#a855f7', delay: '155ms' },
  { x: 108, y: -278, rotate: 32, color: '#60a5fa', delay: '65ms' },
  { x: 150, y: -194, rotate: 46, color: '#f43f5e', delay: '115ms' },
  { x: 172, y: -250, rotate: 58, color: '#10b981', delay: '35ms' },
  { x: 0, y: -356, rotate: 0, color: '#34d399', delay: '0ms' },
  { x: -4, y: -168, rotate: -10, color: '#facc15', delay: '165ms' },
]

function getHabitStreak(habitId, trackerByDate) {
  let streak = 0
  let cursor = new Date()

  while (trackerByDate[format(cursor, 'yyyy-MM-dd')]?.[habitId]) {
    streak += 1
    cursor = subDays(cursor, 1)
  }

  return streak
}

function createGoalBurst() {
  return {
    id: Date.now() + Math.random(),
    x: window.innerWidth / 2 + (Math.random() * 120 - 60),
    y: Math.max(window.innerHeight * 0.28 + (Math.random() * 40 - 20), 170),
    createdAt: Date.now(),
  }
}

export default function GoalsHabitsPage() {
  const [goals, setGoals] = useState([])
  const [activeGoalIndex, setActiveGoalIndex] = useState(0)
  const [draftGoal, setDraftGoal] = useState('')
  const [editingGoalId, setEditingGoalId] = useState(null)
  const [isTimedGoal, setIsTimedGoal] = useState(false)
  const [draftGoalDate, setDraftGoalDate] = useState('')
  const [motivation, setMotivation] = useState(() => randomMotivation())
  const [savingGoal, setSavingGoal] = useState(false)
  const [isGoalEditing, setIsGoalEditing] = useState(false)
  const [goalDragOffset, setGoalDragOffset] = useState(0)
  const [goalIsDragging, setGoalIsDragging] = useState(false)
  const [goalIsAnimating, setGoalIsAnimating] = useState(false)

  const [habits, setHabits] = useState([])
  const [habitTracker, setHabitTracker] = useState({})
  const [habitDraft, setHabitDraft] = useState('')
  const [editingHabitId, setEditingHabitId] = useState(null)
  const [isHabitEditing, setIsHabitEditing] = useState(false)
  const [savingHabit, setSavingHabit] = useState(false)
  const [savingHabitCell, setSavingHabitCell] = useState('')
  const [celebratingCell, setCelebratingCell] = useState('')
  const [celebrationBurst, setCelebrationBurst] = useState(null)
  const [goalCelebration, setGoalCelebration] = useState(null)
  const [goalConfettiBursts, setGoalConfettiBursts] = useState([])
  const todayKey = format(new Date(), 'yyyy-MM-dd')
  const goalSwipeContainerRef = useRef(null)
  const goalSwipeStartRef = useRef({ x: 0, y: 0 })
  const goalSwipeTimeoutRef = useRef(0)
  const activeGoal = goals[activeGoalIndex] ?? null
  const previousGoal = goals.length > 0
    ? goals[(activeGoalIndex - 1 + goals.length) % goals.length]
    : null
  const nextGoal = goals.length > 0
    ? goals[(activeGoalIndex + 1) % goals.length]
    : null

  useEffect(() => {
    if (!celebratingCell) return undefined

    const timeoutId = window.setTimeout(() => {
      setCelebratingCell('')
    }, 900)

    return () => window.clearTimeout(timeoutId)
  }, [celebratingCell])

  useEffect(() => {
    if (!celebrationBurst) return undefined

    const timeoutId = window.setTimeout(() => {
      setCelebrationBurst(null)
    }, 1200)

    return () => window.clearTimeout(timeoutId)
  }, [celebrationBurst])

  useEffect(() => {
    if (!goalCelebration) return undefined

    setGoalConfettiBursts([createGoalBurst()])

    const intervalId = window.setInterval(() => {
      setGoalConfettiBursts(current => [...current, createGoalBurst()])
    }, 520)

    return () => window.clearInterval(intervalId)
  }, [goalCelebration])

  useEffect(() => {
    if (goalConfettiBursts.length === 0) return undefined

    const intervalId = window.setInterval(() => {
      const cutoff = Date.now() - 1400
      setGoalConfettiBursts(current => current.filter(burst => burst.createdAt > cutoff))
    }, 240)

    return () => window.clearInterval(intervalId)
  }, [goalConfettiBursts.length])

  useEffect(() => {
    return () => {
      if (goalSwipeTimeoutRef.current) {
        window.clearTimeout(goalSwipeTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    Promise.all([
      goalsApi.getAll(),
      habitsApi.getAll(),
      habitTrackerApi.getAll(),
    ]).then(([storedGoals, storedHabits, tracker]) => {
      setGoals(storedGoals)
      setActiveGoalIndex(0)
      setHabits(storedHabits)
      setHabitTracker(tracker)
      setMotivation(randomMotivation())
    })
  }, [])

  useEffect(() => {
    if (goals.length === 0) {
      setActiveGoalIndex(0)
      return
    }

    if (activeGoalIndex > goals.length - 1) {
      setActiveGoalIndex(goals.length - 1)
    }
  }, [activeGoalIndex, goals.length])

  useEffect(() => {
    if (isGoalEditing) return

    setDraftGoal(activeGoal?.text || '')
    setEditingGoalId(activeGoal?.id ?? null)
    setIsTimedGoal(Boolean(activeGoal?.dueDate))
    setDraftGoalDate(activeGoal?.dueDate || '')
  }, [activeGoal, isGoalEditing])

  const visibleWeekDays = useMemo(
    () => {
      const start = new Date(`${todayKey}T00:00:00`)
      return eachDayOfInterval({ start, end: addDays(start, 6) })
    },
    [todayKey]
  )

  const handleSave = async (event) => {
    event.preventDefault()
    setSavingGoal(true)
    try {
      const goal = await goalsApi.save({
        id: editingGoalId,
        text: draftGoal,
        dueDate: isTimedGoal ? draftGoalDate : null,
      })
      const nextGoals = editingGoalId
        ? goals.map(item => (item.id === goal.id ? goal : item))
        : [...goals, goal]

      setGoals(nextGoals)
      setActiveGoalIndex(nextGoals.findIndex(item => item.id === goal.id))
      setEditingGoalId(goal.id)
      setIsGoalEditing(false)
    } finally {
      setSavingGoal(false)
    }
  }

  const handleClear = async () => {
    if (!editingGoalId) return

    setSavingGoal(true)
    try {
      await goalsApi.delete(editingGoalId)
      const nextGoals = goals.filter(goal => goal.id !== editingGoalId)
      setGoals(nextGoals)
      setActiveGoalIndex(Math.min(activeGoalIndex, Math.max(nextGoals.length - 1, 0)))
      setDraftGoal('')
      setEditingGoalId(null)
      setIsTimedGoal(false)
      setDraftGoalDate('')
      setIsGoalEditing(false)
    } finally {
      setSavingGoal(false)
    }
  }

  const handleStartEditing = (goal = activeGoal) => {
    setEditingGoalId(goal?.id ?? null)
    setDraftGoal(goal?.text || '')
    setIsTimedGoal(Boolean(goal?.dueDate))
    setDraftGoalDate(goal?.dueDate || '')
    setIsGoalEditing(true)
  }

  const handleCancelEditing = () => {
    setDraftGoal(activeGoal?.text || '')
    setEditingGoalId(activeGoal?.id ?? null)
    setIsTimedGoal(Boolean(activeGoal?.dueDate))
    setDraftGoalDate(activeGoal?.dueDate || '')
    setIsGoalEditing(false)
  }

  const handleCompleteGoal = async (goal = activeGoal) => {
    if (!goal?.text || goal.completed) return

    const completedGoalText = goal.text

    setSavingGoal(true)
    try {
      const completedGoal = await goalsApi.save({
        ...goal,
        completed: true,
        completedAt: new Date().toISOString(),
      })

      const nextGoals = goals.map(item => (item.id === completedGoal.id ? completedGoal : item))
      setGoals(nextGoals)
      setDraftGoal(completedGoal.text)
      setEditingGoalId(completedGoal.id)
      setIsTimedGoal(Boolean(completedGoal.dueDate))
      setDraftGoalDate(completedGoal.dueDate || '')
      setIsGoalEditing(false)
      setMotivation(randomMotivation())
      setGoalCelebration({
        text: completedGoalText,
      })
    } finally {
      setSavingGoal(false)
    }
  }

  const getFormattedGoalDueDate = (goal) => (
    goal?.dueDate
      ? format(new Date(`${goal.dueDate}T00:00:00`), 'MMM d, yyyy')
      : ''
  )

  const goalSwipeAnimationMs = 280

  const resetGoalSwipePosition = (animated = false) => {
    setGoalIsDragging(false)

    if (!animated) {
      setGoalIsAnimating(false)
      setGoalDragOffset(0)
      return
    }

    setGoalIsAnimating(true)
    setGoalDragOffset(0)

    if (goalSwipeTimeoutRef.current) {
      window.clearTimeout(goalSwipeTimeoutRef.current)
    }

    goalSwipeTimeoutRef.current = window.setTimeout(() => {
      setGoalIsAnimating(false)
      goalSwipeTimeoutRef.current = 0
    }, goalSwipeAnimationMs)
  }

  const moveToGoal = (direction) => {
    if (goals.length <= 1 || goalIsAnimating) return

    const containerWidth = goalSwipeContainerRef.current?.clientWidth ?? 0
    if (containerWidth <= 0) return

    setGoalIsDragging(false)
    setGoalIsAnimating(true)
    setGoalDragOffset(direction > 0 ? -containerWidth : containerWidth)

    if (goalSwipeTimeoutRef.current) {
      window.clearTimeout(goalSwipeTimeoutRef.current)
    }

    goalSwipeTimeoutRef.current = window.setTimeout(() => {
      setActiveGoalIndex(current => {
        const nextIndex = current + direction
        if (nextIndex < 0) return goals.length - 1
        if (nextIndex >= goals.length) return 0
        return nextIndex
      })
      setGoalDragOffset(0)
      setGoalIsAnimating(false)
      goalSwipeTimeoutRef.current = 0
    }, goalSwipeAnimationMs)
  }

  const handleGoalTouchStart = (event) => {
    if (goals.length <= 1 || goalIsAnimating) return

    const touch = event.touches[0]
    goalSwipeStartRef.current = { x: touch.clientX, y: touch.clientY }
    setGoalIsDragging(false)
  }

  const handleGoalTouchMove = (event) => {
    if (goals.length <= 1 || goalIsAnimating) return

    const touch = event.touches[0]
    const deltaX = touch.clientX - goalSwipeStartRef.current.x
    const deltaY = touch.clientY - goalSwipeStartRef.current.y

    if (Math.abs(deltaX) <= Math.abs(deltaY) && !goalIsDragging) {
      return
    }

    const containerWidth = goalSwipeContainerRef.current?.clientWidth ?? 0
    const limitedDeltaX = containerWidth > 0
      ? Math.max(Math.min(deltaX, containerWidth * 0.92), -containerWidth * 0.92)
      : deltaX

    setGoalIsDragging(true)
    setGoalDragOffset(limitedDeltaX)
  }

  const handleGoalTouchEnd = (event) => {
    if (goals.length <= 1 || goalIsAnimating) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - goalSwipeStartRef.current.x
    const deltaY = touch.clientY - goalSwipeStartRef.current.y
    const containerWidth = goalSwipeContainerRef.current?.clientWidth ?? 0
    const swipeThreshold = Math.min(Math.max(containerWidth * 0.22, 56), 110)

    if (!goalIsDragging || Math.abs(deltaX) <= Math.abs(deltaY)) {
      resetGoalSwipePosition()
      return
    }

    if (Math.abs(deltaX) >= swipeThreshold) {
      moveToGoal(deltaX < 0 ? 1 : -1)
      return
    }

    resetGoalSwipePosition(true)
  }

  const handleGoalTouchCancel = () => {
    resetGoalSwipePosition(true)
  }

  const showGoalAtIndex = (index) => {
    if (index === activeGoalIndex) return
    setActiveGoalIndex(index)
  }

  const renderGoalCard = (goal, label, stateClass = '', interactive = false) => {
    if (!goal) return null

    const isCompleted = Boolean(goal.completed)

    return (
      <article
        className={`goal-swipe-card rounded-3xl border bg-white px-4 py-4 shadow-[0_16px_40px_-26px_rgba(15,23,42,0.22)] dark:bg-gray-800 ${stateClass}`}
      >
        <div className="space-y-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-3 min-w-0">
              <div className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl text-lg ${isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-primary-100 dark:bg-primary-900/30'}`}>
                {isCompleted ? '✓' : '🎯'}
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-500 dark:text-primary-400">{label}</p>
                <p className={`text-lg font-semibold leading-7 ${isCompleted ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-gray-100'}`}>{goal.text}</p>
              </div>
            </div>
            {isCompleted && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 flex-shrink-0">
                Completed
              </span>
            )}
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-primary-200/80 to-transparent dark:via-primary-700/80" />

          <div className="px-1 pt-0.5">
            <p className="text-sm leading-6 text-gray-500 dark:text-gray-400 italic">
              {motivation}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 px-1 pt-1">
            <div>
              {getFormattedGoalDueDate(goal) && (
                <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-800/80 dark:bg-amber-900/20 dark:text-amber-300">
                  Due {getFormattedGoalDueDate(goal)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={interactive && !isCompleted ? () => handleCompleteGoal(goal) : undefined}
              disabled={!interactive || savingGoal || isCompleted}
              className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-100 ${isCompleted ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-emerald-600 text-white active:bg-emerald-700'}`}
            >
              {savingGoal && interactive && !isCompleted ? 'Completing...' : isCompleted ? 'Completed ✓' : 'Complete Goal'}
            </button>
          </div>
        </div>
      </article>
    )
  }

  const openHabitSheet = (habit = null) => {
    setEditingHabitId(habit?.id ?? null)
    setHabitDraft(habit?.name ?? '')
    setIsHabitEditing(true)
  }

  const closeHabitSheet = () => {
    setEditingHabitId(null)
    setHabitDraft('')
    setIsHabitEditing(false)
  }

  const handleSaveHabit = async (event) => {
    event.preventDefault()
    setSavingHabit(true)
    try {
      const savedHabit = editingHabitId
        ? await habitsApi.update(editingHabitId, habitDraft)
        : await habitsApi.create(habitDraft)

      setHabits(current => {
        if (editingHabitId) {
          return current.map(habit => (habit.id === savedHabit.id ? savedHabit : habit))
        }
        return [...current, savedHabit]
      })

      closeHabitSheet()
    } finally {
      setSavingHabit(false)
    }
  }

  const handleDeleteHabit = async () => {
    if (!editingHabitId) return

    setSavingHabit(true)
    try {
      await habitsApi.delete(editingHabitId)
      setHabits(current => current.filter(habit => habit.id !== editingHabitId))
      setHabitTracker(current => {
        const nextTracker = {}
        for (const [date, habitsByDay] of Object.entries(current)) {
          const nextDay = { ...habitsByDay }
          delete nextDay[String(editingHabitId)]
          if (Object.keys(nextDay).length > 0) {
            nextTracker[date] = nextDay
          }
        }
        return nextTracker
      })
      closeHabitSheet()
    } finally {
      setSavingHabit(false)
    }
  }

  const isHabitDone = (date, habitId) => Boolean(habitTracker[date]?.[habitId])

  const toggleHabitDone = async (date, habitId, target) => {
    const done = !isHabitDone(date, habitId)
    const cellKey = `${date}:${habitId}`
    setSavingHabitCell(cellKey)

    try {
      await habitTrackerApi.setDone(date, habitId, done)
      setHabitTracker(current => {
        const nextTracker = { ...current }
        const nextDay = { ...(nextTracker[date] ?? {}) }

        if (done) {
          nextDay[String(habitId)] = true
          nextTracker[date] = nextDay
        } else {
          delete nextDay[String(habitId)]
          if (Object.keys(nextDay).length > 0) {
            nextTracker[date] = nextDay
          } else {
            delete nextTracker[date]
          }
        }

        return nextTracker
      })

      if (done) {
        setCelebratingCell(cellKey)
        if (target) {
          const rect = target.getBoundingClientRect()
          setCelebrationBurst({
            id: Date.now(),
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          })
        }
      }
    } finally {
      setSavingHabitCell('')
    }
  }

  return (
    <>
      {celebrationBurst && (
        <div key={celebrationBurst.id} className="habit-page-confetti-layer" aria-hidden="true">
          {CONFETTI_PARTICLES.map((particle, index) => (
            <span
              key={`page-confetti-${celebrationBurst.id}-${index}`}
              className="habit-page-confetti-piece"
              style={{
                left: `${celebrationBurst.x}px`,
                top: `${celebrationBurst.y}px`,
                backgroundColor: particle.color,
                '--burst-x': `${particle.x}px`,
                '--burst-y': `${particle.y}px`,
                '--burst-rotate': `${particle.rotate}deg`,
                animationDelay: particle.delay,
              }}
            />
          ))}
        </div>
      )}

      {goalConfettiBursts.length > 0 && (
        <div className="habit-page-confetti-layer z-[78]" aria-hidden="true">
          {goalConfettiBursts.flatMap(burst => (
            GOAL_CONFETTI_PARTICLES.map((particle, index) => (
              <span
                key={`goal-confetti-${burst.id}-${index}`}
                className="habit-page-confetti-piece"
                style={{
                  left: `${burst.x}px`,
                  top: `${burst.y}px`,
                  backgroundColor: particle.color,
                  '--burst-x': `${particle.x}px`,
                  '--burst-y': `${particle.y}px`,
                  '--burst-rotate': `${particle.rotate}deg`,
                  animationDelay: particle.delay,
                }}
              />
            ))
          ))}
        </div>
      )}

      <div className="space-y-4">
        <section className="card">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary-500 dark:text-primary-400">Goals and Habits</p>
              <h1 className="mt-1 text-xl font-bold text-gray-800 dark:text-gray-100">Your Goals</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Keep one goal front and center, then swipe left or right to move through the rest.</p>
            </div>
            <div className="flex items-center gap-2">
              {activeGoal && (
                <button
                  type="button"
                  onClick={() => handleStartEditing(activeGoal)}
                  className="h-10 flex-shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300 transition-colors active:bg-gray-100 dark:active:bg-gray-700"
                >
                  Edit
                </button>
              )}
              <button
                type="button"
                onClick={() => handleStartEditing(null)}
                className="h-10 flex-shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300 transition-colors active:bg-gray-100 dark:active:bg-gray-700"
              >
                + Add
              </button>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700" />

          {activeGoal ? (
            <div className="space-y-4">
              <div
                ref={goalSwipeContainerRef}
                onTouchStart={handleGoalTouchStart}
                onTouchMove={handleGoalTouchMove}
                onTouchEnd={handleGoalTouchEnd}
                onTouchCancel={handleGoalTouchCancel}
                className="goal-swipe-viewport relative overflow-hidden"
              >
                <div
                  className={`goal-swipe-layer ${goalIsAnimating ? 'goal-swipe-layer-animating' : ''} ${goalIsDragging ? 'goal-swipe-layer-dragging' : ''}`}
                  style={{ '--goal-swipe-offset': `${goalDragOffset}px` }}
                >
                  {previousGoal && goals.length > 1 && renderGoalCard(previousGoal, `Goal ${((activeGoalIndex - 1 + goals.length) % goals.length) + 1}`, 'goal-swipe-card-previous')}
                  {renderGoalCard(activeGoal, `Goal ${activeGoalIndex + 1}`, 'goal-swipe-card-current border-primary-100 dark:border-primary-800', true)}
                  {nextGoal && goals.length > 1 && renderGoalCard(nextGoal, `Goal ${((activeGoalIndex + 1) % goals.length) + 1}`, 'goal-swipe-card-next')}
                </div>
              </div>

              {goals.length > 1 && (
                <div className="flex items-center justify-center gap-2">
                  {goals.map((goal, index) => (
                    <button
                      key={`goal-dot-${goal.id}`}
                      type="button"
                      onClick={() => showGoalAtIndex(index)}
                      className={`h-2.5 rounded-full transition-all ${index === activeGoalIndex ? 'w-6 bg-primary-500' : 'w-2.5 bg-gray-300 dark:bg-gray-600'}`}
                      aria-label={`Show goal ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 px-4 py-8 text-center bg-gray-50/80 dark:border-gray-600 dark:bg-gray-800/40">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm dark:bg-gray-800">
                🎯
              </div>
              <p className="text-base font-semibold text-gray-800 dark:text-gray-100">No goal yet</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Tap Add to create your first goal. After that you can swipe between them here.</p>
            </div>
          )}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Habits</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Track weekly habits here without adding them to the main calendar.</p>
            </div>
            <button
              type="button"
              onClick={() => openHabitSheet()}
              className="h-10 flex-shrink-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 px-3 text-sm font-semibold text-gray-600 dark:text-gray-300 transition-colors active:bg-gray-100 dark:active:bg-gray-700"
            >
              + Add
            </button>
          </div>
        </div>

        {habits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 px-4 py-6 text-sm text-center text-gray-500 dark:text-gray-400">
            Add a habit to start tracking it for the week.
          </div>
        ) : (
          <div className="space-y-3">
            {habits.map(habit => {
              const streak = getHabitStreak(habit.id, habitTracker)
              const completedDays = visibleWeekDays.filter(day => isHabitDone(format(day, 'yyyy-MM-dd'), habit.id)).length

              return (
                <div
                  key={habit.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/70 p-3 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{habit.name}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      <span>🔥 {streak} day{streak === 1 ? '' : 's'} streak</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openHabitSheet(habit)}
                      className="rounded-xl border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-300 active:bg-gray-50 dark:active:bg-gray-700"
                    >
                      Edit
                    </button>
                  </div>

                  <div
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `repeat(${Math.max(visibleWeekDays.length, 1)}, minmax(0, 1fr))` }}
                  >
                    {visibleWeekDays.map(day => {
                      const date = format(day, 'yyyy-MM-dd')
                      const done = isHabitDone(date, habit.id)
                      const cellKey = `${date}:${habit.id}`
                      const pending = savingHabitCell === cellKey
                      const celebrating = celebratingCell === cellKey
                      const canToggle = isToday(day)
                      const weekdayIndex = day.getDay()

                      return (
                        <button
                          key={cellKey}
                          type="button"
                          onClick={(event) => {
                            if (canToggle) {
                              toggleHabitDone(date, habit.id, event.currentTarget)
                            }
                          }}
                          disabled={!canToggle || pending}
                          className={`relative overflow-hidden rounded-2xl border px-1 py-2.5 min-h-[72px] flex flex-col items-center justify-center gap-1 text-center transition-all ${done ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm' : canToggle ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-300' : 'border-gray-200/80 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500'} ${canToggle && !done ? 'ring-2 ring-primary-200 dark:ring-primary-800' : ''} ${pending ? 'opacity-60' : canToggle ? 'active:scale-[0.98]' : 'opacity-80'} ${celebrating ? 'habit-complete-pop' : ''}`}
                          aria-pressed={done}
                          aria-label={`${habit.name} on ${format(day, 'EEEE, MMMM d')}`}
                        >
                          <span className={`text-[10px] font-bold uppercase ${done ? 'text-emerald-100' : 'text-gray-400 dark:text-gray-500'}`}>
                            {WEEKDAYS[weekdayIndex].slice(0, 1)}
                          </span>
                          <span className={`text-sm font-semibold ${done ? 'text-white' : canToggle ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-100'}`}>
                            {format(day, 'd')}
                          </span>
                          <span className="text-lg leading-none">{done ? '✓' : canToggle ? '○' : '·'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {isGoalEditing && (
        <>
          <div className="sheet-backdrop" onClick={handleCancelEditing} />
          <div className="sheet">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            <form onSubmit={handleSave} className="px-4 pb-4 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {editingGoalId ? '✏️ Edit Goal' : '🎯 New Goal'}
                </h2>
                <button
                  type="button"
                  onClick={handleCancelEditing}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 active:bg-gray-200 text-gray-500 text-lg"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="label">Goal</label>
                <textarea
                  className="input resize-none min-h-[140px]"
                  placeholder="Write the goal you want to keep front and center..."
                  value={draftGoal}
                  onChange={event => setDraftGoal(event.target.value)}
                  maxLength={220}
                  autoFocus
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-gray-400 dark:text-gray-500">Short and direct works best.</p>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{draftGoal.trim().length}/220</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Suggestions</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Swipe sideways</p>
                </div>
                <div className="-mx-4 px-4 overflow-x-auto pb-1 scrollbar-none">
                  <div className="flex gap-2 w-max min-w-full">
                    {GOAL_SUGGESTIONS.map(suggestion => {
                      const isSelected = draftGoal.trim() === suggestion

                      return (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setDraftGoal(suggestion)}
                          className={`max-w-[200px] rounded-full border px-3 py-2 text-left text-xs font-semibold leading-5 transition-colors whitespace-normal ${
                            isSelected
                              ? 'border-primary-600 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-900/30 dark:text-primary-300'
                              : 'border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200 active:bg-gray-50 dark:active:bg-gray-700'
                          }`}
                        >
                          {suggestion}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isTimedGoal}
                    onChange={event => {
                      const nextChecked = event.target.checked
                      setIsTimedGoal(nextChecked)
                      if (nextChecked && !draftGoalDate) {
                        setDraftGoalDate(todayKey)
                      }
                      if (!nextChecked) {
                        setDraftGoalDate('')
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Make this a timed goal</span>
                </label>

                {isTimedGoal && (
                  <div className="mt-3 space-y-2">
                    <label className="label mb-0">Goal Date</label>
                    <input
                      type="date"
                      value={draftGoalDate}
                      min={todayKey}
                      onChange={event => setDraftGoalDate(event.target.value)}
                      className="input"
                    />
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      This only shows the target date. Nothing happens automatically if the goal is not completed.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button className="btn-primary flex-1" type="submit" disabled={savingGoal || !draftGoal.trim() || (isTimedGoal && !draftGoalDate)}>
                  {savingGoal ? 'Saving...' : editingGoalId ? 'Save Changes' : 'Save Goal'}
                </button>
                <button className="btn-secondary" type="button" onClick={handleCancelEditing} disabled={savingGoal}>
                  Cancel
                </button>
                {editingGoalId && (
                  <button className="btn-secondary" type="button" onClick={handleClear} disabled={savingGoal}>
                    Clear
                  </button>
                )}
              </div>
            </form>
          </div>
        </>
      )}

      {isHabitEditing && (
        <>
          <div className="sheet-backdrop" onClick={closeHabitSheet} />
          <div className="sheet">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            <form onSubmit={handleSaveHabit} className="px-4 pb-4 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {editingHabitId ? '✏️ Edit Habit' : '✅ New Habit'}
                </h2>
                <button
                  type="button"
                  onClick={closeHabitSheet}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 active:bg-gray-200 text-gray-500 text-lg"
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="label">Habit</label>
                <input
                  className="input"
                  placeholder="Walk after dinner"
                  value={habitDraft}
                  onChange={event => setHabitDraft(event.target.value)}
                  maxLength={80}
                  autoFocus
                />
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-gray-400 dark:text-gray-500">This tracker stays separate from the main calendar.</p>
                  <p className="text-xs font-medium text-gray-400 dark:text-gray-500">{habitDraft.trim().length}/80</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="btn-primary flex-1" type="submit" disabled={savingHabit || !habitDraft.trim()}>
                  {savingHabit ? 'Saving...' : editingHabitId ? 'Save Changes' : 'Save Habit'}
                </button>
                <button className="btn-secondary" type="button" onClick={closeHabitSheet} disabled={savingHabit}>
                  Cancel
                </button>
                {editingHabitId && (
                  <button className="btn-secondary" type="button" onClick={handleDeleteHabit} disabled={savingHabit}>
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        </>
      )}

      {goalCelebration && (
        <>
          <div className="sheet-backdrop z-[75]" onClick={() => { setGoalCelebration(null); setGoalConfettiBursts([]) }} />
          <div className="fixed inset-x-4 top-[40%] z-[80] -translate-y-1/2 rounded-[28px] border border-emerald-200 bg-white p-5 shadow-[0_32px_100px_-38px_rgba(16,185,129,0.55)] dark:border-emerald-900/60 dark:bg-gray-800 sm:left-1/2 sm:w-full sm:max-w-md sm:-translate-x-1/2">
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-3xl dark:bg-emerald-900/30">
                🎉
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-500 dark:text-emerald-400">Congratulations!!!</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Goal completed</h3>
                <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
                  You completed <span className="font-semibold text-gray-800 dark:text-gray-200">{goalCelebration.text}</span>. Keep that momentum going.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setGoalCelebration(null); setGoalConfettiBursts([]) }}
                className="btn-primary w-full"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
      </div>
    </>
  )
}