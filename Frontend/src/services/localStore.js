// This module is the active frontend data layer.
// It keeps the app local-first by storing all user-facing state under `ht_*`
// keys and also centralizes the cross-feature cleanup/sync rules so components
// do not each have to understand how metrics, alarms, medications, goals, and
// habits affect one another.

// ─── localStorage keys ────────────────────────────────────────────────────────
const KEYS = {
  METRICS:     'ht_metrics',
  ENTRIES:     'ht_entries',
  APPEARANCES: 'ht_appearances',
  MED_TRACKER: 'ht_med_tracker',
  HABITS: 'ht_habits',
  HABIT_TRACKER: 'ht_habit_tracker',
  GOALS: 'ht_goals',
  CURRENT_GOAL: 'ht_current_goal',
  NEXT_ID:     'ht_next_id',
}

const MEDICATION_METRIC_COLOR = '#10b981'
const DEFAULT_METRICS = [
  {
    name: 'Weight',
    type: 'NUMBER',
    calendarOnly: false,
    unit: 'kg',
    minValue: null,
    maxValue: null,
    color: '#22c55e',
  },
  {
    name: 'Pain',
    type: 'SCALE',
    calendarOnly: false,
    unit: '',
    minValue: 1,
    maxValue: 10,
    color: '#ef4444',
  },
  {
    name: 'Sleep',
    type: 'SCALE',
    calendarOnly: false,
    unit: '',
    minValue: 1,
    maxValue: 10,
    color: '#3b82f6',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function nextId() {
  const id = load(KEYS.NEXT_ID, 1)
  save(KEYS.NEXT_ID, id + 1)
  return id
}

function normalizeMetricName(name) {
  return String(name || '').trim().toLowerCase()
}

function ensureDefaultMetrics() {
  const metrics = load(KEYS.METRICS, [])
  const existingNames = new Set(metrics.map(metric => normalizeMetricName(metric.name)))
  const missingDefaults = DEFAULT_METRICS
    .filter(metric => !existingNames.has(normalizeMetricName(metric.name)))
    .map(metric => ({
      ...metric,
      id: nextId(),
    }))

  if (missingDefaults.length === 0) {
    return metrics
  }

  const nextMetrics = [...metrics, ...missingDefaults]
  save(KEYS.METRICS, nextMetrics)
  return nextMetrics
}

function normalizeMedicationName(name) {
  return name.trim().toLowerCase()
}

function findMedicationMetric(metrics, medicationName) {
  const normalizedName = normalizeMedicationName(medicationName)
  return metrics.find(metric => {
    if (metric.source === 'medication' && normalizeMedicationName(metric.medicationName || metric.name || '') === normalizedName) {
      return true
    }
    return metric.calendarOnly && metric.type === 'YES_NO' && normalizeMedicationName(metric.name || '') === normalizedName
  })
}

function ensureMedicationMetric(medicationName) {
  const metrics = load(KEYS.METRICS, [])
  const existingMetric = findMedicationMetric(metrics, medicationName)
  if (existingMetric) return existingMetric

  const metric = {
    id: nextId(),
    name: medicationName,
    medicationName,
    source: 'medication',
    type: 'YES_NO',
    calendarOnly: true,
    unit: '',
    minValue: null,
    maxValue: null,
    color: MEDICATION_METRIC_COLOR,
  }

  metrics.push(metric)
  save(KEYS.METRICS, metrics)
  return metric
}

function syncMedicationEntry(date, medicationName, taken) {
  const metric = ensureMedicationMetric(medicationName)
  const entries = load(KEYS.ENTRIES, {})
  const existing = entries[date] ?? { id: nextId(), date, notes: '', values: [] }
  const values = [...(existing.values ?? [])]
  const valueIndex = values.findIndex(value => value.metricId === metric.id)

  if (taken) {
    const nextValue = { metricId: metric.id, value: 'Yes' }
    if (valueIndex === -1) values.push(nextValue)
    else values[valueIndex] = nextValue
  } else if (valueIndex !== -1) {
    values.splice(valueIndex, 1)
  }

  const nextEntry = {
    ...existing,
    notes: existing.notes ?? '',
    values,
    impacts: existing.impacts ?? {},
    overallDay: existing.overallDay ?? '',
    sleepToday: existing.sleepToday ?? '',
    foodToday: existing.foodToday ?? '',
    stressToday: existing.stressToday ?? '',
    activityToday: existing.activityToday ?? '',
    dailyBeans: existing.dailyBeans ?? [],
    dailyCheckInCompleted: existing.dailyCheckInCompleted ?? false,
  }

  if (!hasEntryContent(nextEntry)) {
    delete entries[date]
  } else {
    entries[date] = nextEntry
  }

  save(KEYS.ENTRIES, entries)
}

function hasEntryContent(entry) {
  const notes = entry?.notes ?? ''
  const values = entry?.values ?? []
  const impacts = entry?.impacts ?? {}
  const overallDay = entry?.overallDay ?? ''
  const sleepToday = entry?.sleepToday ?? ''
  const foodToday = entry?.foodToday ?? ''
  const stressToday = entry?.stressToday ?? ''
  const activityToday = entry?.activityToday ?? ''
  const dailyBeans = entry?.dailyBeans ?? []
  const dailyCheckInCompleted = entry?.dailyCheckInCompleted ?? false
  return Boolean(notes) || values.length > 0 || Object.keys(impacts).length > 0 || Boolean(overallDay) || Boolean(sleepToday) || Boolean(foodToday) || Boolean(stressToday) || Boolean(activityToday) || dailyBeans.length > 0 || Boolean(dailyCheckInCompleted)
}

function pruneEmptyEntries(entries) {
  for (const date of Object.keys(entries)) {
    const entry = entries[date]
    if (!hasEntryContent(entry)) {
      delete entries[date]
    }
  }
}

function deleteHabitHistory(habitId) {
  const tracker = load(KEYS.HABIT_TRACKER, {})
  for (const date of Object.keys(tracker)) {
    delete tracker[date]?.[habitId]
    if (Object.keys(tracker[date] || {}).length === 0) {
      delete tracker[date]
    }
  }
  save(KEYS.HABIT_TRACKER, tracker)
}

function deleteMedicationEverywhere(medicationName) {
  const normalizedName = normalizeMedicationName(medicationName)

  const alarms = load('ht_alarms', [])
  const cleanedAlarms = alarms.map(alarm => ({
    ...alarm,
    meds: (alarm.meds || []).filter(med => normalizeMedicationName(med.name || '') !== normalizedName),
  }))
  save('ht_alarms', cleanedAlarms)

  const savedMedicationNames = load('ht_med_names', [])
  save('ht_med_names', savedMedicationNames.filter(name => normalizeMedicationName(name) !== normalizedName))

  const tracker = load(KEYS.MED_TRACKER, {})
  for (const date of Object.keys(tracker)) {
    for (const trackedMedicationName of Object.keys(tracker[date])) {
      if (normalizeMedicationName(trackedMedicationName) === normalizedName) {
        delete tracker[date][trackedMedicationName]
      }
    }
    const remainingMedicationNames = Object.keys(tracker[date])
    if (remainingMedicationNames.length === 0) {
      delete tracker[date]
    }
  }
  save(KEYS.MED_TRACKER, tracker)
}

function getKnownMedicationNames() {
  const names = new Set()

  const savedMedicationNames = load('ht_med_names', [])
  savedMedicationNames.forEach(name => names.add(normalizeMedicationName(name)))

  const alarms = load('ht_alarms', [])
  alarms.forEach(alarm => {
    ;(alarm.meds || []).forEach(med => {
      if (med?.name) names.add(normalizeMedicationName(med.name))
    })
  })

  const tracker = load(KEYS.MED_TRACKER, {})
  Object.values(tracker).forEach(day => {
    Object.keys(day || {}).forEach(name => names.add(normalizeMedicationName(name)))
  })

  return names
}

function isMedicationBackedMetric(metric) {
  if (!metric) return false
  if (metric.source === 'medication') return true

  if (!(metric.calendarOnly && metric.type === 'YES_NO')) {
    return false
  }

  const normalizedName = normalizeMedicationName(metric.medicationName || metric.name || '')
  if (!normalizedName) return false

  return getKnownMedicationNames().has(normalizedName)
}

function getMedicationMetricName(metric) {
  if (!isMedicationBackedMetric(metric)) return ''
  return String(metric.medicationName || metric.name || '').trim()
}

function trackerDaySignature(day) {
  return Object.keys(day || {})
    .sort((left, right) => left.localeCompare(right))
    .join('|')
}

function syncMedicationTrackerFromEntry(date, values) {
  const metrics = load(KEYS.METRICS, [])
  const tracker = load(KEYS.MED_TRACKER, {})
  const nextDay = {}

  ;(values || []).forEach(value => {
    const metric = metrics.find(item => item.id === Number(value.metricId))
    const medicationName = getMedicationMetricName(metric)
    if (!medicationName) return

    if (String(value.value) === 'Yes') {
      nextDay[medicationName] = true
    }
  })

  const previousSignature = trackerDaySignature(tracker[date])
  const nextSignature = trackerDaySignature(nextDay)

  if (Object.keys(nextDay).length > 0) {
    tracker[date] = nextDay
  } else {
    delete tracker[date]
  }

  save(KEYS.MED_TRACKER, tracker)
  return previousSignature !== nextSignature
}

function notifyMedicationTrackerChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('medication-tracker-changed'))
}

function notifyEntriesChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('entries-changed'))
}

// Wrap every return value in a resolved promise so callers can always use .then()
const p = (val) => Promise.resolve(val)

function loadGoals() {
  const storedGoals = load(KEYS.GOALS, null)
  if (Array.isArray(storedGoals)) {
    return storedGoals
      .map(goal => ({
        id: Number(goal?.id) || nextId(),
        text: String(goal?.text || '').trim(),
        dueDate: goal?.dueDate || null,
        completed: Boolean(goal?.completed),
        completedAt: goal?.completedAt || null,
        createdAt: goal?.createdAt || goal?.updatedAt || new Date().toISOString(),
        updatedAt: goal?.updatedAt || goal?.createdAt || new Date().toISOString(),
      }))
      .filter(goal => goal.text)
  }

  const legacyGoal = load(KEYS.CURRENT_GOAL, null)
  if (!legacyGoal?.text) {
    return []
  }

  const migratedGoal = {
    id: Number(legacyGoal.id) || nextId(),
    text: String(legacyGoal.text || '').trim(),
    dueDate: legacyGoal.dueDate || null,
    completed: Boolean(legacyGoal.completed),
    completedAt: legacyGoal.completedAt || null,
    createdAt: legacyGoal.createdAt || legacyGoal.updatedAt || new Date().toISOString(),
    updatedAt: legacyGoal.updatedAt || legacyGoal.createdAt || new Date().toISOString(),
  }

  save(KEYS.GOALS, [migratedGoal])
  localStorage.removeItem(KEYS.CURRENT_GOAL)
  return [migratedGoal]
}

// ─── App Data ───────────────────────────────────────────────────────────────
export const appDataApi = {
  clearAll() {
    const keysToRemove = []

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith('ht_')) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
    return p(undefined)
  },
}

// ─── Metrics ─────────────────────────────────────────────────────────────────
export const metricsApi = {
  getAll() {
    return p(ensureDefaultMetrics())
  },

  create(dto) {
    const metrics = load(KEYS.METRICS, [])
    const metric = { ...dto, id: nextId() }
    metrics.push(metric)
    save(KEYS.METRICS, metrics)
    return p(metric)
  },

  update(id, dto) {
    const metrics = load(KEYS.METRICS, [])
    const idx = metrics.findIndex(m => m.id === Number(id))
    if (idx === -1) return Promise.reject(new Error(`Metric ${id} not found`))

    const existingMetric = metrics[idx]
    metrics[idx] = {
      ...dto,
      id: Number(id),
      source: existingMetric.source,
      medicationName: existingMetric.medicationName,
    }

    save(KEYS.METRICS, metrics)
    return p(metrics[idx])
  },

  delete(id) {
    const metrics = load(KEYS.METRICS, [])
    const metricToDelete = metrics.find(metric => metric.id === Number(id))
    save(KEYS.METRICS, metrics.filter(metric => metric.id !== Number(id)))

    // Also remove this metric's values from all entries
    const entries = load(KEYS.ENTRIES, {})
    for (const date of Object.keys(entries)) {
      entries[date].values = (entries[date].values || [])
        .filter(v => v.metricId !== Number(id))
    }
    pruneEmptyEntries(entries)
    save(KEYS.ENTRIES, entries)

    if (isMedicationBackedMetric(metricToDelete)) {
      deleteMedicationEverywhere(metricToDelete.medicationName || metricToDelete.name || '')
    }

    return p(undefined)
  },
}

// ─── Daily Entries ────────────────────────────────────────────────────────────
export const entriesApi = {
  getByMonth(year, month) {
    const entries = load(KEYS.ENTRIES, {})
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const result = Object.values(entries).filter(e => e.date.startsWith(prefix))
    return p(result)
  },

  getByDate(date) {
    const entries = load(KEYS.ENTRIES, {})
    return p(entries[date] ?? null)
  },

  save(date, dto) {
    const entries = load(KEYS.ENTRIES, {})
    const existing = entries[date] ?? { id: nextId(), date }
    const updated = {
      ...existing,
      notes: dto.notes ?? existing.notes ?? '',
      values: dto.values ?? existing.values ?? [],
      impacts: dto.impacts ?? existing.impacts ?? {},
      overallDay: dto.overallDay ?? existing.overallDay ?? '',
      sleepToday: dto.sleepToday ?? existing.sleepToday ?? '',
      foodToday: dto.foodToday ?? existing.foodToday ?? '',
      stressToday: dto.stressToday ?? existing.stressToday ?? '',
      activityToday: dto.activityToday ?? existing.activityToday ?? '',
      dailyBeans: dto.dailyBeans ?? existing.dailyBeans ?? [],
      dailyCheckInCompleted: dto.dailyCheckInCompleted ?? existing.dailyCheckInCompleted ?? false,
    }
    entries[date] = updated
    save(KEYS.ENTRIES, entries)
    notifyEntriesChanged()

    if (syncMedicationTrackerFromEntry(date, updated.values)) {
      notifyMedicationTrackerChanged()
    }

    return p(updated)
  },

  delete(date) {
    const entries = load(KEYS.ENTRIES, {})
    delete entries[date]
    save(KEYS.ENTRIES, entries)
    notifyEntriesChanged()

    if (syncMedicationTrackerFromEntry(date, [])) {
      notifyMedicationTrackerChanged()
    }

    return p(undefined)
  },

  getRange(start, end) {
    const entries = load(KEYS.ENTRIES, {})
    return p(
      Object.values(entries).filter(e => e.date >= start && e.date <= end)
    )
  },

  getAll() {
    const entries = load(KEYS.ENTRIES, {})
    return p(Object.values(entries))
  },
}

// ─── Alarms ───────────────────────────────────────────────────────────────────
export const alarmsApi = {
  getAll() {
    return p(load('ht_alarms', []))
  },

  create(dto) {
    const alarms = load('ht_alarms', [])
    const alarm = { ...dto, id: nextId(), enabled: true, lastFired: null }
    alarms.push(alarm)
    save('ht_alarms', alarms)
    return p(alarm)
  },

  update(id, dto) {
    const alarms = load('ht_alarms', [])
    const idx = alarms.findIndex(a => a.id === Number(id))
    if (idx === -1) return Promise.reject(new Error(`Alarm ${id} not found`))
    alarms[idx] = { ...alarms[idx], ...dto, id: Number(id) }
    save('ht_alarms', alarms)
    return p(alarms[idx])
  },

  delete(id) {
    const alarms = load('ht_alarms', [])
    save('ht_alarms', alarms.filter(a => a.id !== Number(id)))
    return p(undefined)
  },
}

// ─── Medication Names (reusable library) ────────────────────────────────────
export const medNamesApi = {
  getAll() {
    return p(load('ht_med_names', []))
  },

  add(name) {
    const trimmed = name.trim()
    if (!trimmed) return p(load('ht_med_names', []))
    const names = load('ht_med_names', [])
    if (!names.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      names.push(trimmed)
      names.sort((a, b) => a.localeCompare(b))
      save('ht_med_names', names)
    }
    return p(load('ht_med_names', []))
  },

  remove(name) {
    const names = load('ht_med_names', [])
    save('ht_med_names', names.filter(n => n !== name))
    return p(undefined)
  },
}

// ─── Medication Tracker ──────────────────────────────────────────────────────
export const medicationTrackerApi = {
  getRange(start, end) {
    const tracker = load(KEYS.MED_TRACKER, {})
    const result = {}
    for (const [date, meds] of Object.entries(tracker)) {
      if (date >= start && date <= end) result[date] = meds
    }
    return p(result)
  },

  setTaken(date, medicationName, taken) {
    const tracker = load(KEYS.MED_TRACKER, {})
    const day = { ...(tracker[date] ?? {}) }

    if (taken) {
      day[medicationName] = true
    } else {
      delete day[medicationName]
    }

    if (Object.keys(day).length > 0) {
      tracker[date] = day
    } else {
      delete tracker[date]
    }

    save(KEYS.MED_TRACKER, tracker)
    syncMedicationEntry(date, medicationName, taken)
    return p(tracker[date] ?? {})
  },
}

// ─── Habits ─────────────────────────────────────────────────────────────────
export const habitsApi = {
  getAll() {
    return p(load(KEYS.HABITS, []))
  },

  create(name) {
    const trimmed = name.trim()
    if (!trimmed) return Promise.reject(new Error('Habit name is required'))

    const habits = load(KEYS.HABITS, [])
    const habit = {
      id: nextId(),
      name: trimmed,
      createdAt: new Date().toISOString(),
    }

    habits.push(habit)
    save(KEYS.HABITS, habits)
    return p(habit)
  },

  update(id, name) {
    const trimmed = name.trim()
    if (!trimmed) return Promise.reject(new Error('Habit name is required'))

    const habits = load(KEYS.HABITS, [])
    const idx = habits.findIndex(habit => habit.id === Number(id))
    if (idx === -1) return Promise.reject(new Error(`Habit ${id} not found`))

    habits[idx] = {
      ...habits[idx],
      name: trimmed,
      updatedAt: new Date().toISOString(),
    }

    save(KEYS.HABITS, habits)
    return p(habits[idx])
  },

  delete(id) {
    const numericId = Number(id)
    const habits = load(KEYS.HABITS, [])
    save(KEYS.HABITS, habits.filter(habit => habit.id !== numericId))
    deleteHabitHistory(numericId)
    return p(undefined)
  },
}

// ─── Habit Tracker ──────────────────────────────────────────────────────────
export const habitTrackerApi = {
  getAll() {
    return p(load(KEYS.HABIT_TRACKER, {}))
  },

  getRange(start, end) {
    const tracker = load(KEYS.HABIT_TRACKER, {})
    const result = {}
    for (const [date, habits] of Object.entries(tracker)) {
      if (date >= start && date <= end) result[date] = habits
    }
    return p(result)
  },

  setDone(date, habitId, done) {
    const tracker = load(KEYS.HABIT_TRACKER, {})
    const day = { ...(tracker[date] ?? {}) }
    const key = String(habitId)

    if (done) {
      day[key] = true
    } else {
      delete day[key]
    }

    if (Object.keys(day).length > 0) {
      tracker[date] = day
    } else {
      delete tracker[date]
    }

    save(KEYS.HABIT_TRACKER, tracker)
    return p(tracker[date] ?? {})
  },
}

// ─── Goals ───────────────────────────────────────────────────────────────────
export const goalsApi = {
  getAll() {
    return p(loadGoals())
  },

  getCurrent() {
    return p(loadGoals()[0] ?? null)
  },

  save(input, options = {}) {
    const text = typeof input === 'string' ? input : input?.text || ''
    const dueDate = typeof input === 'string' ? options.dueDate : input?.dueDate
    const id = typeof input === 'string' ? options.id : input?.id
    const completed = typeof input === 'string' ? options.completed : input?.completed
    const completedAt = typeof input === 'string' ? options.completedAt : input?.completedAt
    const trimmed = text.trim()
    const goals = loadGoals()

    if (!trimmed) {
      if (id == null) {
        return p(null)
      }

      const remainingGoals = goals.filter(goal => goal.id !== Number(id))
      save(KEYS.GOALS, remainingGoals)
      return p(null)
    }

    const existingGoal = goals.find(goal => goal.id === Number(id))
    const goal = {
      id: existingGoal?.id ?? nextId(),
      text: trimmed,
      dueDate: dueDate || null,
      completed: completed ?? existingGoal?.completed ?? false,
      completedAt: completed === false
        ? null
        : completedAt ?? existingGoal?.completedAt ?? null,
      createdAt: existingGoal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const nextGoals = existingGoal
      ? goals.map(item => (item.id === existingGoal.id ? goal : item))
      : [...goals, goal]

    save(KEYS.GOALS, nextGoals)
    localStorage.removeItem(KEYS.CURRENT_GOAL)
    return p(goal)
  },

  saveCurrent(input, options = {}) {
    const currentGoal = loadGoals()[0]
    return this.save(typeof input === 'string'
      ? input
      : { ...input, id: input?.id ?? currentGoal?.id ?? options.id }
    , options)
  },

  delete(id) {
    const nextGoals = loadGoals().filter(goal => goal.id !== Number(id))
    save(KEYS.GOALS, nextGoals)
    localStorage.removeItem(KEYS.CURRENT_GOAL)
    return p(undefined)
  },

  clearCurrent() {
    const goals = loadGoals()
    goals.shift()
    save(KEYS.GOALS, goals)
    localStorage.removeItem(KEYS.CURRENT_GOAL)
    return p(undefined)
  },
}

// ─── Day Appearances ──────────────────────────────────────────────────────────
export const appearancesApi = {
  getByMonth(year, month) {
    const appearances = load(KEYS.APPEARANCES, {})
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const result = Object.values(appearances).filter(a => a.date.startsWith(prefix))
    return p(result)
  },

  upsert(date, dto) {
    const appearances = load(KEYS.APPEARANCES, {})
    const existing = appearances[date] ?? { id: nextId(), date }
    const updated = { ...existing, ...dto, date }
    appearances[date] = updated
    save(KEYS.APPEARANCES, appearances)
    return p(updated)
  },

  delete(date) {
    const appearances = load(KEYS.APPEARANCES, {})
    delete appearances[date]
    save(KEYS.APPEARANCES, appearances)
    return p(undefined)
  },

  getRange(start, end) {
    const appearances = load(KEYS.APPEARANCES, {})
    return p(
      Object.values(appearances).filter(a => a.date >= start && a.date <= end)
    )
  },
}
