import { useState, useEffect } from 'react'
import { metricsApi } from '../../services/api'
import { useThemeContext } from '../../context/ThemeContext'

const DEFAULT_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#84cc16',
]

const EMPTY_FORM = {
  name: '',
  type: 'NUMBER',
  calendarOnly: false,
  unit: '',
  minValue: '',
  maxValue: '',
  color: '#22c55e',
}

export default function MetricsManager() {
  const [metrics, setMetrics] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const { theme, setTheme } = useThemeContext()

  const loadMetrics = async () => {
    setLoading(true)
    try {
      setMetrics(await metricsApi.getAll())
    } catch (e) {
      setError('Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMetrics() }, [])

  const openNew = () => {
    setEditId(null)
    setForm(EMPTY_FORM)
    setError('')
    setShowModal(true)
  }

  const startEdit = (metric) => {
    setEditId(metric.id)
    setForm({
      name: metric.name,
      type: metric.type,
      calendarOnly: metric.calendarOnly,
      unit: metric.unit || '',
      minValue: metric.minValue ?? '',
      maxValue: metric.maxValue ?? '',
      color: metric.color || '#22c55e',
    })
    setError('')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditId(null)
    setForm(EMPTY_FORM)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError('')
    try {
      const dto = {
        ...form,
        minValue: form.minValue !== '' ? Number(form.minValue) : null,
        maxValue: form.maxValue !== '' ? Number(form.maxValue) : null,
      }
      if (editId) {
        await metricsApi.update(editId, dto)
      } else {
        await metricsApi.create(dto)
      }
      await loadMetrics()
      closeModal()
    } catch (e) {
      setError('Save failed. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete metric "${name}"? This will remove all recorded values.`)) return
    try {
      await metricsApi.delete(id)
      await loadMetrics()
    } catch (e) {
      setError('Delete failed.')
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Settings</h1>
          <button onClick={openNew} className="btn-primary px-4 py-2 text-sm min-h-0 h-10">
            + New Metric
          </button>
        </div>

        {/* Appearance / Theme picker */}
        <div className="card">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">Appearance</h2>
          <div className="flex gap-2">
            {[
              { value: 'light',  label: '☀️ Light'  },
              { value: 'dark',   label: '🌙 Dark'   },
              { value: 'system', label: '📱 System' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                  theme === opt.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 active:bg-gray-100 dark:active:bg-gray-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics list */}
        <div className="card">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-3">Your Metrics</h2>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : metrics.length === 0 ? (
            <p className="text-gray-400 italic text-sm">No metrics yet. Tap “+ New Metric” to create one.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {metrics.map(m => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: m.color || '#22c55e' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{m.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {m.type.replace('_', ' / ')}
                      {m.unit && ` · ${m.unit}`}
                      {m.calendarOnly && ' · 📅 calendar only'}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => startEdit(m)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 active:bg-primary-100 dark:active:bg-primary-900 text-gray-500 active:text-primary-600 text-sm"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(m.id, m.name)}
                      className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 active:bg-red-100 dark:active:bg-red-900 text-gray-500 active:text-red-500 text-sm"
                    >
                      🗑
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Modal bottom sheet */}
      {showModal && (
        <>
          <div className="sheet-backdrop" onClick={closeModal} />
          <div className="sheet">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            <div className="px-4 pb-4 space-y-4">
              {/* Modal header */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                  {editId ? '✏️ Edit Metric' : '➕ New Metric'}
                </h2>
                <button
                  onClick={closeModal}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 active:bg-gray-200 text-gray-500 text-lg"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Name *</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Pain Level, Weight, Slept Well"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label">Type</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  >
                    <option value="NUMBER">Number (free value)</option>
                    <option value="SCALE">Scale (slider)</option>
                    <option value="YES_NO">Yes / No</option>
                  </select>
                </div>

                {form.type === 'NUMBER' && (
                  <div>
                    <label className="label">Unit</label>
                    <input
                      className="input"
                      value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      placeholder="kg, hrs, mg…"
                    />
                  </div>
                )}

                {(form.type === 'NUMBER' || form.type === 'SCALE') && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label">Min</label>
                      <input
                        type="number"
                        className="input"
                        value={form.minValue}
                        onChange={e => setForm(f => ({ ...f, minValue: e.target.value }))}
                        placeholder={form.type === 'SCALE' ? '1' : ''}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="label">Max</label>
                      <input
                        type="number"
                        className="input"
                        value={form.maxValue}
                        onChange={e => setForm(f => ({ ...f, maxValue: e.target.value }))}
                        placeholder={form.type === 'SCALE' ? '10' : ''}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Indicator Color</label>
                  <div className="flex flex-wrap gap-3 items-center">
                    {DEFAULT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={`w-9 h-9 rounded-full border-2 transition-all active:scale-110 ${
                          form.color === c ? 'border-gray-700 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                    <input
                      type="color"
                      value={form.color}
                      onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="w-9 h-9 rounded-full cursor-pointer border-2 border-gray-300"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 py-2 cursor-pointer">
                  <div
                    className={`w-12 h-6 rounded-full transition-colors ${
                      form.calendarOnly ? 'bg-primary-600' : 'bg-gray-300'
                    }`}
                    onClick={() => setForm(f => ({ ...f, calendarOnly: !f.calendarOnly }))}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-transform ${
                      form.calendarOnly ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </div>
                  <span className="text-sm text-gray-700 flex-1">
                    Calendar only
                    <span className="block text-xs text-gray-400">Exclude from trend charts</span>
                  </span>
                </label>

                <div className="flex gap-2 pt-1">
                  <button type="submit" className="btn-primary flex-1" disabled={saving}>
                    {saving ? 'Saving…' : editId ? 'Update' : 'Create Metric'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  )
}

