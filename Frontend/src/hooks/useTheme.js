import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ht_theme'
const COLOUR_KEY  = 'ht_color_theme'
const BG_KEY      = 'ht_bg_theme'
const GRADIENT_KEY = 'ht_gradient'

function applyTheme(preference) {
  const root = document.documentElement
  if (preference === 'dark') {
    root.classList.add('dark')
  } else if (preference === 'light') {
    root.classList.remove('dark')
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) root.classList.add('dark')
    else root.classList.remove('dark')
  }
}

function applyColorTheme(name) {
  const root = document.documentElement
  const toRemove = [...root.classList].filter(c => c.startsWith('theme-'))
  toRemove.forEach(c => root.classList.remove(c))
  if (name && name !== 'green') root.classList.add(`theme-${name}`)
}

function applyBgTheme(name) {
  const root = document.documentElement
  const toRemove = [...root.classList].filter(c => ['bg-warm', 'bg-cool', 'bg-pure'].includes(c))
  toRemove.forEach(c => root.classList.remove(c))
  if (name && name !== 'default') root.classList.add(`bg-${name}`)
}

function applyGradient(name) {
  const root = document.documentElement
  const toRemove = [...root.classList].filter(c => c.startsWith('grad-'))
  toRemove.forEach(c => root.classList.remove(c))
  if (name && name !== 'none') root.classList.add(`grad-${name}`)
}

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'light'
  )
  const [colorTheme, setColorTheme] = useState(
    () => localStorage.getItem(COLOUR_KEY) || 'green'
  )
  const [bgTheme, setBgTheme] = useState(
    () => localStorage.getItem(BG_KEY) || 'default'
  )
  const [gradientTheme, setGradientTheme] = useState(
    () => localStorage.getItem(GRADIENT_KEY) || 'forest'
  )

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem(STORAGE_KEY, theme)

    // Listen for OS-level changes when in system mode
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  useEffect(() => {
    applyColorTheme(colorTheme)
    localStorage.setItem(COLOUR_KEY, colorTheme)
  }, [colorTheme])

  useEffect(() => {
    applyBgTheme(bgTheme)
    localStorage.setItem(BG_KEY, bgTheme)
  }, [bgTheme])

  useEffect(() => {
    applyGradient(gradientTheme)
    localStorage.setItem(GRADIENT_KEY, gradientTheme)
  }, [gradientTheme])

  return { theme, setTheme, colorTheme, setColorTheme, bgTheme, setBgTheme, gradientTheme, setGradientTheme }
}

// Call this once at app startup to apply saved preference before first render
export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) || 'light'
  applyTheme(saved)
  const savedColor = localStorage.getItem(COLOUR_KEY) || 'green'
  applyColorTheme(savedColor)
  const savedBg = localStorage.getItem(BG_KEY) || 'default'
  applyBgTheme(savedBg)
  const savedGradient = localStorage.getItem(GRADIENT_KEY) || 'forest'
  applyGradient(savedGradient)
}

