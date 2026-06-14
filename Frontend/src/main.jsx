import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { initTheme } from './hooks/useTheme'
import { ThemeProvider } from './context/ThemeContext'
import { LocaleProvider } from './context/LocaleContext'
import { GoogleOAuthProvider } from '@react-oauth/google'

// Apply saved theme before first render to avoid flash
initTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId="182781546784-o9rdhhqtlh3erlqov40lrgkrtuuqsspp.apps.googleusercontent.com">
      <ThemeProvider>
        <LocaleProvider>
          <App />
        </LocaleProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
)
