import { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { appDataApi, metricsApi } from '../../services/api'
import { useThemeContext } from '../../context/ThemeContext'
import { useLocaleContext } from '../../context/LocaleContext'
import { alarmsApi, medNamesApi } from '../../services/localStore'
import DriveSync from '../Sync/DriveSync'

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

function getMedicationNames(savedNames, alarms) {
  const names = new Set()

  savedNames.forEach(name => {
    const trimmed = name.trim()
    if (trimmed) names.add(trimmed)
  })

  alarms.forEach(alarm => {
    ;(alarm.meds || []).forEach(med => {
      const trimmed = med?.name?.trim()
      if (trimmed) names.add(trimmed)
    })
  })

  return [...names].sort((left, right) => left.localeCompare(right))
}

export default function MetricsManager() {
  const [metrics, setMetrics] = useState([])
  const [medicationNames, setMedicationNames] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showThemeSheet, setShowThemeSheet] = useState(false)
  const { theme, setTheme, colorTheme, setColorTheme, bgTheme, setBgTheme, gradientTheme, setGradientTheme } = useThemeContext()
  const { t, lang, setLang } = useLocaleContext()

  useEffect(() => {
    document.body.style.overflow = showThemeSheet ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showThemeSheet])

  const visibleMetrics = useMemo(
    () => metrics.filter(metric => metric.source !== 'medication'),
    [metrics]
  )

  const loadMetrics = async () => {
    setLoading(true)
    try {
      const [loadedMetrics, loadedMedNames, loadedAlarms] = await Promise.all([
        metricsApi.getAll(),
        medNamesApi.getAll(),
        alarmsApi.getAll(),
      ])

      setMetrics(loadedMetrics)
      setMedicationNames(getMedicationNames(loadedMedNames, loadedAlarms))
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
    if (!window.confirm(t('delete_metric_confirm', name))) return
    try {
      await metricsApi.delete(id)
      await loadMetrics()
    } catch (e) {
      setError('Delete failed.')
    }
  }

  const handleDeleteAllData = async () => {
    const confirmed = window.confirm(t('delete_all_confirm'))
    if (!confirmed) return

    setSaving(true)
    setError('')

    try {
      await appDataApi.clearAll()
      setTheme('light')
      setColorTheme('green')
      setBgTheme('default')
      setGradientTheme('forest')
      await loadMetrics()
      setForm(EMPTY_FORM)
      setEditId(null)
      setShowModal(false)
      window.dispatchEvent(new CustomEvent('alarms-changed'))
    } catch (e) {
      setError(t('delete_failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{t('page_settings')}</h1>
        </div>

        {/* Google Drive Backup */}
        <DriveSync />

        {/* Appearance / Theme picker */}
        <div data-tutorial="settings-customise" className="card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{t('section_appearance')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 capitalize">
                {theme === 'system' ? t('mode_system').replace('📱 ', '') : theme === 'light' ? t('mode_light').replace('☀️ ', '') : t('mode_dark').replace('🌙 ', '')}
                {' · '}
                {colorTheme.charAt(0).toUpperCase() + colorTheme.slice(1)}
                {bgTheme !== 'default' ? ` · ${bgTheme.charAt(0).toUpperCase() + bgTheme.slice(1)} bg` : ''}
                {gradientTheme !== 'none' ? ` · ${t('grad_' + gradientTheme)}` : ''}
              </p>
            </div>
            <button
              onClick={() => setShowThemeSheet(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white active:opacity-80 transition-opacity"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                <path d="M4.93 4.93a10 10 0 0 0 0 14.14" />
              </svg>
              {t('btn_customise')}
            </button>
          </div>
        </div>

        {/* Theme bottom sheet — rendered via portal so it sits above all scroll containers */}
        {showThemeSheet && createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => setShowThemeSheet(false)}
            />
            {/* Sheet */}
            <div
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-gray-200 dark:border-gray-700 shadow-2xl px-5 pt-5 pb-10 overflow-y-auto max-h-[85vh]"
              style={{ backgroundColor: 'var(--bg-card)' }}
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600 mx-auto mb-5" />

              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('section_appearance')}</h3>
                <button
                  onClick={() => setShowThemeSheet(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 active:opacity-70"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Light / Dark / System */}
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">{t('section_mode')}</p>
              <div className="flex gap-2 mb-6">
                {[
                  { value: 'light',  labelKey: 'mode_light'   },
                  { value: 'dark',   labelKey: 'mode_dark'    },
                  { value: 'system', labelKey: 'mode_system'  },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                      theme === opt.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 active:opacity-70'
                    }`}
                    style={theme !== opt.value ? { backgroundColor: 'var(--bg)' } : {}}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>

              {/* Accent colour */}
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">{t('section_accent')}</p>
              <div className="flex gap-4 mb-6">
                {[
                  { value: 'green',  hex: '#16a34a', label: 'Green'  },
                  { value: 'blue',   hex: '#2563eb', label: 'Blue'   },
                  { value: 'purple', hex: '#9333ea', label: 'Purple' },
                  { value: 'orange', hex: '#ea580c', label: 'Orange' },
                  { value: 'rose',   hex: '#e11d48', label: 'Rose'   },
                ].map(ct => (
                  <button
                    key={ct.value}
                    onClick={() => setColorTheme(ct.value)}
                    aria-label={ct.label}
                    style={{
                      backgroundColor: ct.hex,
                      outline: colorTheme === ct.value ? `3px solid ${ct.hex}` : '3px solid transparent',
                      outlineOffset: '3px',
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-transform active:scale-90"
                  >
                    {colorTheme === ct.value && (
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {/* Background */}
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">{t('section_background')}</p>
              <div className="flex gap-4 mb-6">
                {[
                  { value: 'default', light: '#f9fafb', dark: '#111827', label: 'Default' },
                  { value: 'warm',    light: '#fafaf9', dark: '#1c1917', label: 'Warm'    },
                  { value: 'cool',    light: '#f0f4ff', dark: '#0f172a', label: 'Cool'    },
                  { value: 'pure',    light: '#ffffff', dark: '#09090b', label: 'Pure'    },
                ].map(bt => (
                  <div key={bt.value} className="flex flex-col items-center gap-1.5">
                    <button
                      onClick={() => setBgTheme(bt.value)}
                      aria-label={bt.label}
                      style={{
                        outline: bgTheme === bt.value ? '3px solid rgb(var(--p-600))' : '3px solid transparent',
                        outlineOffset: '3px',
                      }}
                      className="w-10 h-10 rounded-full overflow-hidden transition-transform active:scale-90 border border-gray-300 dark:border-gray-600"
                    >
                      <div style={{ background: `linear-gradient(135deg, ${bt.light} 50%, ${bt.dark} 50%)` }} className="w-full h-full" />
                    </button>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{bt.label}</span>
                  </div>
                ))}
              </div>

              {/* Gradient */}
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">{t('section_gradient')}</p>
              <div className="flex flex-wrap gap-4 mb-6">
                {[
                  { value: 'none',   preview: null },
                  { value: 'sunset', preview: 'linear-gradient(160deg, #ffecd2 0%, #fcb69f 45%, #ff9a9e 100%)' },
                  { value: 'ocean',  preview: 'linear-gradient(160deg, #e0f2fe 0%, #bae6fd 50%, #93c5fd 100%)' },
                  { value: 'forest', preview: 'linear-gradient(160deg, #dcfce7 0%, #a7f3d0 50%, #6ee7b7 100%)' },
                  { value: 'aurora', preview: 'linear-gradient(160deg, #f0e6ff 0%, #d8b4fe 50%, #c084fc 100%)' },
                  { value: 'rose',   preview: 'linear-gradient(160deg, #ffe4e6 0%, #fda4af 50%, #fb7185 100%)' },
                  { value: 'gold',   preview: 'linear-gradient(160deg, #fffbeb 0%, #fde68a 50%, #fcd34d 100%)' },
                ].map(g => (
                  <div key={g.value} className="flex flex-col items-center gap-1.5">
                    <button
                      onClick={() => setGradientTheme(g.value)}
                      aria-label={t('grad_' + g.value)}
                      style={{
                        background: g.preview ?? 'linear-gradient(135deg, #f9fafb 50%, #111827 50%)',
                        outline: gradientTheme === g.value ? '3px solid rgb(var(--p-600))' : '3px solid transparent',
                        outlineOffset: '3px',
                      }}
                      className="w-10 h-10 rounded-full overflow-hidden transition-transform active:scale-90 border border-gray-300 dark:border-gray-600 flex items-center justify-center"
                    >
                      {gradientTheme === g.value && (
                        <svg className="w-5 h-5 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">{t('grad_' + g.value)}</span>
                  </div>
                ))}
              </div>

              {/* Language */}
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">{t('section_language')}</p>              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'en', labelKey: 'lang_en' },
                  { value: 'pl', labelKey: 'lang_pl' },
                  { value: 'sv', labelKey: 'lang_sv' },
                  { value: 'es', labelKey: 'lang_es' },
                ].map(lc => (
                  <button
                    key={lc.value}
                    onClick={() => setLang(lc.value)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                      lang === lc.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 active:opacity-70'
                    }`}
                    style={lang !== lc.value ? { backgroundColor: 'var(--bg)' } : {}}
                  >
                    {t(lc.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}

        <div className="card">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{t('section_medications')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('meds_subtitle')}</p>
            </div>
            {!loading && medicationNames.length > 0 && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                {medicationNames.length}
              </span>
            )}
          </div>

          {loading ? (
            <p className="text-gray-400 text-sm">{t('loading')}</p>
          ) : medicationNames.length === 0 ? (
            <p className="text-gray-400 italic text-sm">{t('no_meds_yet')}</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {medicationNames.map(name => (
                <li key={name} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
                    💊
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 break-words">{name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('med_tracked_desc')}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Metrics list */}
        <div className="card">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">{t('section_metrics')}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('metrics_subtitle')}</p>
            </div>
            <button onClick={openNew} className="btn-primary px-3 py-1.5 text-sm min-h-0 flex-shrink-0">
              {t('btn_new_metric')}
            </button>
          </div>
          {loading ? (
            <p className="text-gray-400 text-sm">{t('loading')}</p>
          ) : visibleMetrics.length === 0 ? (
            <p className="text-gray-400 italic text-sm">{t('no_metrics_yet', t('btn_new_metric'))}</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700">
              {visibleMetrics.map(m => (
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

        <div className="card border-red-200 dark:border-red-900/50">
          <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-2">{t('section_danger')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {t('danger_subtitle')}
          </p>
          <button
            type="button"
            onClick={handleDeleteAllData}
            className="btn-danger w-full"
            disabled={saving}
          >
            {saving ? t('loading') : t('btn_delete_all')}
          </button>
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
                  {editId ? t('edit_metric_title') : t('new_metric_title')}
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
                  <label className="label">{t('label_name')}</label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder={t('name_placeholder')}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="label">{t('label_type')}</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  >
                    <option value="NUMBER">{t('type_number')}</option>
                    <option value="SCALE">{t('type_scale')}</option>
                    <option value="YES_NO">{t('type_yes_no')}</option>
                  </select>
                </div>

                {form.type === 'NUMBER' && (
                  <div>
                    <label className="label">{t('label_unit')}</label>
                    <input
                      className="input"
                      value={form.unit}
                      onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      placeholder={t('unit_placeholder')}
                    />
                  </div>
                )}

                {(form.type === 'NUMBER' || form.type === 'SCALE') && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label">{t('label_min')}</label>
                      <input
                        type="number"
                        className="input"
                        value={form.minValue}
                        onChange={e => setForm(f => ({ ...f, minValue: e.target.value }))}
                        placeholder={form.type === 'SCALE' ? '1' : ''}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="label">{t('label_max')}</label>
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
                  <label className="label">{t('label_color')}</label>
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
                    {t('cal_only_toggle')}
                    <span className="block text-xs text-gray-400">{t('cal_only_subtitle')}</span>
                  </span>
                </label>

                <div className="flex gap-2 pt-1">
                  <button type="submit" className="btn-primary flex-1" disabled={saving}>
                    {saving ? t('loading') : editId ? t('update') : t('btn_create_metric')}
                  </button>
                  <button type="button" className="btn-secondary" onClick={closeModal}>
                    {t('cancel')}
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

