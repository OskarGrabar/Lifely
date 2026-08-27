import { useState, useEffect } from 'react'

const STORAGE_KEY = 'ht_lang'
const SUPPORTED = ['en', 'pl', 'sv', 'es']

function getInitialLang() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved && SUPPORTED.includes(saved)) return saved
  return 'en'
}

export function useLocale() {
  const [lang, setLangState] = useState(getInitialLang)

  const setLang = (next) => {
    if (SUPPORTED.includes(next)) {
      localStorage.setItem(STORAGE_KEY, next)
      setLangState(next)
    }
  }

  return { lang, setLang }
}
