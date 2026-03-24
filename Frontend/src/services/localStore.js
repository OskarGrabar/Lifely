// ─── localStorage keys ────────────────────────────────────────────────────────
const KEYS = {
  METRICS:     'ht_metrics',
  ENTRIES:     'ht_entries',
  APPEARANCES: 'ht_appearances',
  NEXT_ID:     'ht_next_id',
}

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

// Wrap every return value in a resolved promise so callers can always use .then()
const p = (val) => Promise.resolve(val)

// ─── Metrics ─────────────────────────────────────────────────────────────────
export const metricsApi = {
  getAll() {
    return p(load(KEYS.METRICS, []))
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
    metrics[idx] = { ...dto, id: Number(id) }
    save(KEYS.METRICS, metrics)
    return p(metrics[idx])
  },

  delete(id) {
    const metrics = load(KEYS.METRICS, [])
    save(KEYS.METRICS, metrics.filter(m => m.id !== Number(id)))
    // Also remove this metric's values from all entries
    const entries = load(KEYS.ENTRIES, {})
    for (const date of Object.keys(entries)) {
      entries[date].values = (entries[date].values || [])
        .filter(v => v.metricId !== Number(id))
    }
    save(KEYS.ENTRIES, entries)
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
    const updated = { ...existing, notes: dto.notes ?? '', values: dto.values ?? [] }
    entries[date] = updated
    save(KEYS.ENTRIES, entries)
    return p(updated)
  },

  delete(date) {
    const entries = load(KEYS.ENTRIES, {})
    delete entries[date]
    save(KEYS.ENTRIES, entries)
    return p(undefined)
  },

  getRange(start, end) {
    const entries = load(KEYS.ENTRIES, {})
    return p(
      Object.values(entries).filter(e => e.date >= start && e.date <= end)
    )
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
}
