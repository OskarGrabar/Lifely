import { useState, useEffect } from 'react'
import { alarmsApi, medNamesApi } from '../../services/localStore'
import { scheduleAlarm, cancelAlarm } from '../../services/nativeAlarms'
import TimeWheelPicker from './TimeWheelPicker'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_FULL   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EMPTY_FORM = { label: '', time: '07:00', repeatMode: 'once', days: [], meds: [] }

const MED_UNITS = ['mg', 'g', 'mcg', 'pills', 'ml', 'drops', 'units']

/** Returns the Date when `alarm` will next fire, or null if it never will. */
function getNextFire(alarm) {
  if (!alarm.enabled) return null
  const [hh, mm] = alarm.time.split(':').map(Number)
  const now = new Date()

  if (!alarm.days || alarm.days.length === 0) {
    // Once — fire today if still upcoming, else tomorrow
    const t = new Date(now)
    t.setHours(hh, mm, 0, 0)
    if (t <= now) t.setDate(t.getDate() + 1)
    return t
  }

  // Repeating — scan up to 7 days ahead for the next matching weekday
  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now)
    candidate.setDate(candidate.getDate() + offset)
    candidate.setHours(hh, mm, 0, 0)
    if (candidate <= now) continue
    if (alarm.days.includes(candidate.getDay())) return candidate
  }
  return null
}

/** Returns the soonest upcoming fire Date across all enabled alarms + any pending snooze. */
function getNextAlarmDate(alarms) {
  let best = null
  for (const a of alarms) {
    const t = getNextFire(a)
    if (t && (!best || t < best)) best = t
  }
  // Also include a pending snooze saved in localStorage
  try {
    const raw = localStorage.getItem('ht_snooze')
    if (raw) {
      const { fireAt } = JSON.parse(raw)
      const snoozeDate = new Date(fireAt)
      if (snoozeDate > new Date() && (!best || snoozeDate < best)) best = snoozeDate
    }
  } catch {}
  return best
}

/** Formats ms difference as "X h Y min" or "X min" or "< 1 min". */
function formatCountdown(ms) {
  if (ms < 60000) return '< 1 min'
  const totalMins = Math.round(ms / 60000)
  const hours = Math.floor(totalMins / 60)
  const mins  = totalMins % 60
  if (hours === 0) return `${mins} min`
  if (mins  === 0) return `${hours} h`
  return `${hours} h ${mins} min`
}

function repeatLabel(alarm) {
  if (!alarm.days || alarm.days.length === 0) return 'Once'
  if (alarm.days.length === 7) return 'Every day'
  if (alarm.days.length === 5 && [1,2,3,4,5].every(d => alarm.days.includes(d))) return 'Weekdays'
  if (alarm.days.length === 2 && [0,6].every(d => alarm.days.includes(d))) return 'Weekends'
  return alarm.days.map(d => DAY_FULL[d]).join(', ')
}

function AlarmToggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${enabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function AlarmsPage() {
  const [alarms, setAlarms] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSheet, setShowSheet] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [now, setNow] = useState(() => Date.now())
  const [medNames, setMedNames] = useState([])
  const [showMedPicker, setShowMedPicker] = useState(false)
  const [newMedName, setNewMedName] = useState('')

  // Tick every 15 s to keep the countdown accurate
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000)
    return () => clearInterval(id)
  }, [])

  const nextAlarmDate = getNextAlarmDate(alarms)

  const load = async () => {
    setAlarms(await alarmsApi.getAll())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Re-load whenever Layout disables a one-time alarm after it fires
  useEffect(() => {
    const onChanged = () => load()
    window.addEventListener('alarms-changed', onChanged)
    return () => window.removeEventListener('alarms-changed', onChanged)
  }, [])

  // Load saved medication names
  useEffect(() => {
    medNamesApi.getAll().then(setMedNames)
  }, [])

  // ── Detect when a disabled alarm was just enabled for the first time
  // (alarm ringing overlay is handled in useAlarmScheduler, but we can show
  //  an in-app banner by listening for changes)

  const openNew = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowSheet(true)
  }

  const openEdit = (alarm) => {
    setEditId(alarm.id)
    let repeatMode = 'once'
    if (alarm.days?.length === 7) repeatMode = 'daily'
    else if (alarm.days?.length > 0) repeatMode = 'custom'
    setForm({
      label: alarm.label || '',
      time: alarm.time,
      repeatMode,
      days: alarm.days || [],
      meds: alarm.meds || [],
    })
    setShowSheet(true)
  }

  const closeSheet = () => {
    setShowSheet(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowMedPicker(false)
    setNewMedName('')
  }

  const handleSave = async () => {
    if (!form.time) return
    let days = []
    if (form.repeatMode === 'daily') days = [0,1,2,3,4,5,6]
    else if (form.repeatMode === 'custom') days = form.days

    const dto = { label: form.label.trim(), time: form.time, days, meds: form.meds }
    let saved
    if (editId) {
      saved = await alarmsApi.update(editId, { ...dto, enabled: true, lastFired: null })
    } else {
      saved = await alarmsApi.create(dto)
    }
    await scheduleAlarm(saved)
    await load()
    closeSheet()
  }

  const handleToggle = async (alarm, val) => {
    const updated = await alarmsApi.update(alarm.id, { ...alarm, enabled: val, lastFired: null })
    await scheduleAlarm(updated)
    await load()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this alarm?')) return
    await cancelAlarm(id)
    await alarmsApi.delete(id)
    await load()
  }

  const toggleDay = (d) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort(),
    }))
  }

  // Med helpers
  const updateMed = (idx, field, val) =>
    setForm(f => { const m = [...f.meds]; m[idx] = { ...m[idx], [field]: val }; return { ...f, meds: m } })
  const removeMed = (idx) =>
    setForm(f => ({ ...f, meds: f.meds.filter((_, i) => i !== idx) }))
  const pickMed = (name) => {
    setForm(f => f.meds.some(m => m.name === name) ? f : { ...f, meds: [...f.meds, { name, amount: '', unit: 'mg' }] })
    setShowMedPicker(false)
    setNewMedName('')
  }
  const handleAddNewMed = async () => {
    const trimmed = newMedName.trim()
    if (!trimmed) return
    const updated = await medNamesApi.add(trimmed)
    setMedNames(updated)
    pickMed(trimmed)
  }

  // Sort alarms by time
  const sorted = [...alarms].sort((a, b) => a.time.localeCompare(b.time))

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Alarms</h1>
          <button onClick={openNew} className="btn-primary px-4 py-2 text-sm min-h-0 h-10">
            + Add
          </button>
        </div>

        {/* Next alarm countdown banner */}
        {!loading && nextAlarmDate && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary-50 dark:bg-primary-900/30 border border-primary-100 dark:border-primary-800">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="text-xs font-medium text-primary-500 dark:text-primary-400 uppercase tracking-wide">Next alarm in</p>
              <p className="text-lg font-bold text-primary-700 dark:text-primary-300 leading-tight">
                {formatCountdown(nextAlarmDate.getTime() - now)}
              </p>
              <p className="text-xs text-primary-500 dark:text-primary-400">
                {nextAlarmDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {' · '}
                {nextAlarmDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-sm">Loading…</p>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <span className="text-5xl">⏰</span>
            <p className="text-gray-500 dark:text-gray-400 font-semibold">No alarms set</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Tap "+ Add" to create one</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map(alarm => (
              <div
                key={alarm.id}
                className={`card flex items-center gap-4 transition-opacity ${!alarm.enabled ? 'opacity-50' : ''}`}
              >
                {/* Time + label */}
                <button
                  className="flex-1 text-left min-w-0"
                  onClick={() => openEdit(alarm)}
                >
                  <p className="text-3xl font-thin tabular-nums text-gray-800 dark:text-gray-100 leading-none">
                    {alarm.time}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {alarm.label || '—'} · {repeatLabel(alarm)}
                  </p>
                  {alarm.meds?.length > 0 && (
                    <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5 whitespace-normal break-words leading-relaxed">
                      💊 {alarm.meds.map(m => `${m.name}${m.amount ? ` ${m.amount}${m.unit}` : ''}`).join(' · ')}
                    </p>
                  )}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(alarm.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 active:bg-red-100 dark:active:bg-red-900 text-gray-400 active:text-red-500 text-base flex-shrink-0"
                >
                  🗑
                </button>

                {/* Toggle */}
                <AlarmToggle enabled={alarm.enabled} onChange={v => handleToggle(alarm, v)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit sheet */}
      {showSheet && (
        <>
          <div className="sheet-backdrop" onClick={closeSheet} />
          <div className="sheet">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            <div className="px-4 pb-4 space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {editId ? '✏️ Edit Alarm' : '⏰ New Alarm'}
                </h2>
                <button
                  onClick={closeSheet}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 active:bg-gray-200 text-gray-500 text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Time picker — drum-roll wheel */}
              <div>
                <label className="label text-center block">Time</label>
                <TimeWheelPicker
                  value={form.time}
                  onChange={t => setForm(f => ({ ...f, time: t }))}
                />
              </div>

              {/* Label */}
              <div>
                <label className="label">Label <span className="font-normal text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Morning meds, Wake up…"
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                />
              </div>

              {/* Medications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Medications <span className="font-normal text-gray-400">(optional)</span></label>
                  <button
                    type="button"
                    onClick={() => setShowMedPicker(true)}
                    className="text-xs font-semibold text-primary-600 dark:text-primary-400 px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 active:bg-primary-100 dark:active:bg-primary-900/60"
                  >
                    + Add
                  </button>
                </div>
                {form.meds.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 py-1">No medications added</p>
                ) : (
                  <div className="space-y-2 max-h-[28dvh] overflow-y-auto pr-1 overscroll-contain">
                    {form.meds.map((med, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                        <span className="text-base mt-1">💊</span>
                        <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200 break-words leading-snug pt-1">{med.name}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          className="input w-16 text-center py-1.5 px-2 text-sm flex-shrink-0"
                          placeholder="amt"
                          value={med.amount}
                          onChange={e => updateMed(idx, 'amount', e.target.value)}
                        />
                        <select
                          className="input py-1.5 px-2 text-sm w-20 flex-shrink-0"
                          value={med.unit}
                          onChange={e => updateMed(idx, 'unit', e.target.value)}
                        >
                          {MED_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeMed(idx)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-400 text-xs flex-shrink-0"
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Repeat mode */}
              <div>
                <label className="label">Repeat</label>
                <div className="flex gap-2">
                  {[
                    { value: 'once',   label: 'Once'  },
                    { value: 'daily',  label: 'Daily' },
                    { value: 'custom', label: 'Custom'},
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, repeatMode: opt.value, days: opt.value === 'custom' ? f.days : [] }))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        form.repeatMode === opt.value
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day selector (custom only) */}
              {form.repeatMode === 'custom' && (
                <div>
                  <label className="label">Days</label>
                  <div className="flex justify-between gap-1">
                    {DAY_LABELS.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => toggleDay(i)}
                        className={`flex-1 aspect-square rounded-full text-sm font-bold border-2 transition-colors ${
                          form.days.includes(i)
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  className="btn-primary flex-1"
                  disabled={!form.time || (form.repeatMode === 'custom' && form.days.length === 0)}
                >
                  {editId ? 'Update' : 'Set Alarm'}
                </button>
                <button type="button" className="btn-secondary" onClick={closeSheet}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Medication picker overlay */}
      {showMedPicker && (
        <>
          <div className="sheet-backdrop z-[60]" onClick={() => { setShowMedPicker(false); setNewMedName('') }} />
          <div className="sheet z-[70]">
            <div className="px-4 pt-4 pb-4 flex flex-col gap-3 min-h-0">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Add Medication</h3>
              <button
                type="button"
                onClick={() => { setShowMedPicker(false); setNewMedName('') }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500"
              >✕</button>
            </div>

            {/* New med input */}
            <div className="flex gap-2">
              <input
                type="text"
                className="input flex-1"
                placeholder="Type medication name…"
                value={newMedName}
                onChange={e => setNewMedName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddNewMed() }}
                autoFocus
              />
              <button
                type="button"
                onClick={handleAddNewMed}
                disabled={!newMedName.trim()}
                className="btn-primary px-4 py-2 text-sm min-h-0 h-10 disabled:opacity-40"
              >
                Add
              </button>
            </div>

            {/* Saved med list */}
            {medNames.length > 0 ? (
              <div className="overflow-y-auto min-h-0 max-h-[45dvh] space-y-1 pb-2 overscroll-contain">
                {medNames.map(name => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => pickMed(name)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors ${
                      form.meds.some(m => m.name === name)
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'bg-gray-50 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <span className="text-lg">💊</span>
                    <span className="text-sm font-medium flex-1">{name}</span>
                    {form.meds.some(m => m.name === name) && <span className="text-xs text-primary-500">✓ added</span>}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                Type a name above to create your first medication
              </p>
            )}
          </div>
          </div>
        </>
      )}
    </>
  )
}
