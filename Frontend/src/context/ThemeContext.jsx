import { createContext, useContext } from 'react'
import { useTheme } from '../hooks/useTheme'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const value = useTheme()
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeContext() {
  return useContext(ThemeContext)
}
