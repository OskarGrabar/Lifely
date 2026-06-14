import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { entriesApi, appearancesApi } from '../../services/api'
import { useLocaleContext } from '../../context/LocaleContext'

const PRESET_COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#84cc16'
]

const PRESET_EMOJIS = [
  '😊', '😔', '😴', '🤒', '💪', '🧘', '🏃', '🍎', '🌙', '⚡',
  '🥗', '💊', '🩺', '❤️', '🔥', '❄️', '🌧️', '☀️', '✅', '⚠️',
]

export default function DailyEntryForm({ date, entry, appearance, metrics, onSaved, onClose }) {
  const { t } = useLocaleContext()
  const dateStr = format(date, 'yyyy-MM-dd')

  // Selected metrics to show (dropdown add)
  const [activeMetricIds, setActiveMetricIds] = useState([])
  const [values, setValues] = useState({})       // metricId -> string value
  const [notes, setNotes] = useState('')

  // Appearance
  const [color, setColor] = useState('')
  const [emoji, setEmoji] = useState('')
  const [label, setLabel] = useState('')

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const metricsById = useMemo(
    () => new Map(metrics.map(metric => [metric.id, metric])),
    [metrics]
  )

  // Populate from existing entry/appearance
  useEffect(() => {
    if (entry) {
      setNotes(entry.notes || '')
      const ids = entry.values?.map(v => v.metricId) || []
      setActiveMetricIds(ids)
      const vMap = {}
      entry.values?.forEach(v => { vMap[v.metricId] = v.value })
      setValues(vMap)
    } else {
      setActiveMetricIds([])
      setValues({})
      setNotes('')
    }
    if (appearance) {
      setColor(appearance.color || '')
      setEmoji(appearance.emoji || '')
      setLabel(appearance.label || '')
    } else {
      setColor('')
      setEmoji('')
      setLabel('')
    }
  }, [entry, appearance, dateStr])

  const addMetric = (id) => {
    const numId = Number(id)
    if (!activeMetricIds.includes(numId)) {
      setActiveMetricIds(prev => [...prev, numId])
    }
  }

  const removeMetric = (id) => {
    setActiveMetricIds(prev => prev.filter(mid => mid !== id))
    setValues(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const setValue = (id, val) => {
    setValues(prev => ({ ...prev, [id]: val }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const entryDTO = {
        notes,
        values: activeMetricIds
          .filter(id => values[id] !== undefined && values[id] !== '')
          .map(id => ({ metricId: id, value: String(values[id]) })),
      }
      await entriesApi.save(dateStr, entryDTO)

      if (color || emoji || label) {
        await appearancesApi.upsert(dateStr, { color, emoji, label })
      } else if (appearance) {
        await appearancesApi.delete(dateStr)
      }

      onSaved()
      onClose()
      window.dispatchEvent(new CustomEvent('tut-action-done'))
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(t('delete_day_confirm'))) return
    setDeleting(true)
    try {
      await entriesApi.delete(dateStr)
      await appearancesApi.delete(dateStr).catch(() => {})
      onSaved()
      onClose()
    } catch (err) {
      console.error('Delete failed', err)
    } finally {
      setDeleting(false)
    }
  }

  const availableMetrics = useMemo(
    () => metrics.filter(metric => !activeMetricIds.includes(metric.id)),
    [metrics, activeMetricIds]
  )

  return (
    <div className="px-4 pb-2 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
            {format(date, 'EEEE')}
          </p>
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{format(date, 'MMMM d, yyyy')}</h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 text-gray-500 text-lg"
        >
          ✕
        </button>
      </div>

      {/* Metric Values */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="label mb-0">{t('form_metrics_label')}</span>
          {availableMetrics.length > 0 && (
            <select
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 dark:text-gray-100 min-h-[40px]"
              defaultValue=""
              onChange={e => { if (e.target.value) { addMetric(e.target.value); e.target.value = '' } }}
            >
              <option value="" disabled>{t('add_metric_prompt')}</option>
              {availableMetrics.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          )}
        </div>

        {activeMetricIds.length === 0 && (
          <p className="text-sm text-gray-400 italic py-2">
            {metrics.length === 0
              ? t('no_metrics_form')
              : t('no_metrics_tap', t('add_metric_prompt'))}
          </p>
        )}

        <div className="space-y-2">
          {activeMetricIds.map(id => {
            const metric = metricsById.get(id)
            if (!metric) return null
            return (
              <MetricInput
                key={id}
                metric={metric}
                value={values[id] ?? ''}
                onChange={val => setValue(id, val)}
                onRemove={() => removeMetric(id)}
              />
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="label">{t('form_notes_label')}</label>
        <textarea
          className="input resize-none"
          rows={2}
          placeholder={t('notes_placeholder')}
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {/* Day Appearance — collapsible */}
      <details className="group">
        <summary className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 active:bg-gray-100 dark:active:bg-gray-700 cursor-pointer select-none list-none transition-colors">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('day_appearance_title')}</span>
          <span className="text-xs text-gray-400">{t('appearance_optional')}</span>
          <span className="ml-auto text-gray-500 text-sm group-open:rotate-180 transition-transform">▾</span>
        </summary>

        <div className="mt-2 space-y-4 pt-1 border-t border-gray-100">
          {/* Emoji picker */}
          <div>
            <label className="label">{t('emoji_label')}</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {PRESET_EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(emoji === e ? '' : e)}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all active:scale-95 ${
                    emoji === e
                      ? 'bg-primary-100 ring-2 ring-primary-400 ring-offset-2 ring-offset-white dark:bg-primary-900/30 dark:ring-offset-gray-800'
                      : 'active:bg-gray-100 dark:active:bg-gray-700'
                  }`}
                >
                  <span className="block text-2xl leading-none translate-y-[1px]">{e}</span>
                </button>
              ))}
            </div>
            <input
              type="text"
              className="input"
              maxLength={8}
              placeholder={t('emoji_placeholder')}
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
            />
          </div>

          {/* Color swatches */}
          <div>
            <label className="label">{t('bg_color_label')}</label>
            <div className="flex flex-wrap gap-3 items-center">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(color === c ? '' : c)}
                  className={`w-9 h-9 rounded-full border-2 transition-all active:scale-110 ${
                    color === c ? 'border-primary-500 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={color || '#ffffff'}
                onChange={e => setColor(e.target.value)}
                className="w-9 h-9 rounded-full cursor-pointer border-2 border-gray-300"
              />
            </div>
          </div>
        </div>
      </details>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
          {saving ? t('loading') : t('save')}
        </button>
        {(entry || appearance) && (
          <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? '…' : '🗑'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Individual metric input ─────────────────────────────────────────────────
function MetricInput({ metric, value, onChange, onRemove }) {
  const { t } = useLocaleContext()
  const { name, type, unit, minValue, maxValue } = metric

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl px-4 py-3 space-y-2">
      {/* Name row */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{name}</span>
        <button
          type="button"
          onClick={onRemove}
          className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 active:bg-red-100 active:text-red-500 text-base"
        >
          ×
        </button>
      </div>

      {/* Input */}
      {type === 'YES_NO' && (
        <div className="flex gap-2">
          {['Yes', 'No'].map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors active:scale-95 ${
                value === opt
                  ? opt === 'Yes' ? 'bg-green-500 text-white' : 'bg-red-400 text-white'
                  : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'
              }`}
            >
              {opt === 'Yes' ? t('btn_yes') : t('btn_no')}
            </button>
          ))}
        </div>
      )}

      {type === 'SCALE' && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-400">
            <span>{minValue ?? 1}</span>
            <span className="text-lg font-bold text-primary-700">{value || minValue || 1}</span>
            <span>{maxValue ?? 10}</span>
          </div>
          <input
            type="range"
            min={minValue ?? 1}
            max={maxValue ?? 10}
            step="1"
            value={value || minValue || 1}
            onChange={e => onChange(e.target.value)}
            className="w-full accent-primary-600 h-2"
          />
        </div>
      )}

      {type === 'NUMBER' && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={minValue}
            max={maxValue}
            step="any"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="input"
            placeholder="0"
          />
          {unit && <span className="text-sm text-gray-500 whitespace-nowrap">{unit}</span>}
        </div>
      )}
    </div>
  )
}
