import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ht_theme'

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

export function useTheme() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'system'
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

  return { theme, setTheme }
}

// Call this once at app startup to apply saved preference before first render
export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) || 'system'
  applyTheme(saved)
}
