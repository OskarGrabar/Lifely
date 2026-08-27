import { createContext, useContext, useMemo } from 'react'
import { useLocale } from '../hooks/useLocale'
import { locales, translate } from '../locales/index.js'

const LocaleContext = createContext(null)

export function LocaleProvider({ children }) {
  const { lang, setLang } = useLocale()

  const dict = useMemo(() => locales[lang] ?? locales.en, [lang])

  const t = useMemo(
    () => (key, ...args) => translate(dict, key, ...args),
    [dict]
  )

  return (
    <LocaleContext.Provider value={{ t, lang, setLang }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocaleContext() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocaleContext must be used inside LocaleProvider')
  return ctx
}
