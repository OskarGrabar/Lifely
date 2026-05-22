import { useState, useEffect, useRef, useCallback } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { Capacitor } from '@capacitor/core'
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'
import { backupToDrive, restoreFromDrive } from '../../services/driveSync'

const WEB_CLIENT_ID = '182781546784-o9rdhhqtlh3erlqov40lrgkrtuuqsspp.apps.googleusercontent.com'
const WEB_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const LAST_BACKUP_KEY = 'ht_drive_last_backup'
const TOKEN_KEY = 'ht_drive_token'

const AUTO_SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes

export default function DriveSync() {
  const isNative = Capacitor.isNativePlatform()
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [userEmail, setUserEmail] = useState(null)
  const [isBusy, setIsBusy] = useState(false)
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem(LAST_BACKUP_KEY))
  const [status, setStatus] = useState(null)
  const [restored, setRestored] = useState(false)
  const [autoSyncing, setAutoSyncing] = useState(false)
  const autoSyncTimer = useRef(null)
  const accessTokenRef = useRef(accessToken)

  // Keep ref in sync so interval/event handlers always have the latest token
  useEffect(() => { accessTokenRef.current = accessToken }, [accessToken])

  // Auto-sync: run backup silently
  const silentBackup = useCallback(async () => {
    const token = accessTokenRef.current
    if (!token) return
    setAutoSyncing(true)
    try {
      const ts = await backupToDrive(token)
      localStorage.setItem(LAST_BACKUP_KEY, ts)
      setLastBackup(ts)
    } catch (_) {
      // silent — don't show error for auto-sync
    } finally {
      setAutoSyncing(false)
    }
  }, [])

  // Auto-sync on 5-minute interval while signed in
  useEffect(() => {
    if (!accessToken) { clearInterval(autoSyncTimer.current); return }
    autoSyncTimer.current = setInterval(silentBackup, AUTO_SYNC_INTERVAL)
    return () => clearInterval(autoSyncTimer.current)
  }, [accessToken, silentBackup])

  // Auto-sync when app is backgrounded / tab hidden
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') silentBackup() }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [silentBackup])

  // Initialize GoogleAuth once on mount (native only)
  useEffect(() => {
    if (!isNative) return
    GoogleAuth.initialize({
      clientId: WEB_CLIENT_ID,
      scopes: [WEB_SCOPE],
      grantOfflineAccess: true,
    }).catch(() => {})
  }, [])

  // Validate stored token and fetch email on mount (web only)
  useEffect(() => {
    if (!accessToken || userEmail || isNative) return
    fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(r => r.json())
      .then(info => {
        if (info.error) { localStorage.removeItem(TOKEN_KEY); setAccessToken(null) }
        else setUserEmail(info.email)
      })
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setAccessToken(null) })
  }, [accessToken])

  // Clean up on unmount
  useEffect(() => () => {}, [])

  // Web sign-in via popup (desktop browsers only)
  const webSignIn = useGoogleLogin({
    scope: WEB_SCOPE,
    onSuccess: (tokenResponse) => {
      const token = tokenResponse.access_token
      localStorage.setItem(TOKEN_KEY, token)
      setAccessToken(token)
      setStatus(null)
    },
    onError: () => setStatus({ type: 'error', text: 'Sign-in failed. Please try again.' }),
  })

  // Android sign-in via native Google account picker (one tap, no codes)
  const nativeSignIn = async () => {
    setIsBusy(true)
    setStatus(null)
    try {
      const user = await GoogleAuth.signIn()
      const token = user.authentication.accessToken
      localStorage.setItem(TOKEN_KEY, token)
      setAccessToken(token)
      setStatus(null)
    } catch (e) {
      setStatus({ type: 'error', text: e.message || 'Sign-in failed. Please try again.' })
    } finally {
      setIsBusy(false)
    }
  }

  const handleSignIn = () => {
    if (isNative) nativeSignIn()
    else webSignIn()
  }

  const handleSignOut = async () => {
    if (isNative) {
      try { await GoogleAuth.signOut() } catch (_) {}
    }
    localStorage.removeItem(TOKEN_KEY)
    setAccessToken(null)
    setUserEmail(null)
    setStatus(null)
    setRestored(false)
    setIsBusy(false)
  }

  const handleBackup = async () => {
    setIsBusy(true)
    setStatus(null)
    try {
      const ts = await backupToDrive(accessToken)
      localStorage.setItem(LAST_BACKUP_KEY, ts)
      setLastBackup(ts)
      setStatus({ type: 'success', text: 'Data backed up to Google Drive.' })
    } catch (e) {
      setStatus({ type: 'error', text: e.message })
    } finally {
      setIsBusy(false)
    }
  }

  const handleRestore = async () => {
    const confirmed = window.confirm(
      'Restore data from Google Drive? This will overwrite all current data on this device.'
    )
    if (!confirmed) return
    setIsBusy(true)
    setStatus(null)
    try {
      const ts = await restoreFromDrive(accessToken)
      if (ts) { localStorage.setItem(LAST_BACKUP_KEY, ts); setLastBackup(ts) }
      setRestored(true)
      setStatus({ type: 'success', text: 'Data restored. Tap "Reload App" to see your data.' })
    } catch (e) {
      setStatus({ type: 'error', text: e.message })
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="card">
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">
        Google Drive Backup
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        Save your health data to your personal Google Drive so you can restore it on any device.
      </p>

      {!accessToken ? (
        <div className="space-y-3">
          <button
            onClick={handleSignIn}
            disabled={isBusy}
            className="flex items-center justify-center gap-2 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 active:bg-gray-100 disabled:opacity-50 transition"
          >
            {isBusy ? 'Signing in...' : 'Sign in with Google'}
          </button>

        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              ✓ {userEmail || 'Google account connected'}
            </span>
            <div className="flex items-center gap-2">
              {autoSyncing && (
                <span className="text-xs text-blue-400 animate-pulse">Syncing...</span>
              )}
              <button
                onClick={handleSignOut}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                Sign out
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleBackup}
              disabled={isBusy}
              className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 transition"
            >
              {isBusy ? 'Working...' : '☁ Back Up Now'}
            </button>
            <button
              onClick={handleRestore}
              disabled={isBusy}
              className="flex-1 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-semibold py-2.5 transition"
            >
              {isBusy ? 'Working...' : '⬇ Restore'}
            </button>
          </div>

          {lastBackup && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Last backup: {new Date(lastBackup).toLocaleString()}
            </p>
          )}
          <p className="text-xs text-blue-400 dark:text-blue-500">
            Auto-sync on · backs up every 5 min and when you leave the app
          </p>
        </div>
      )}

      {status && (
        <p
          className={`mt-3 text-sm rounded-lg px-3 py-2 ${
            status.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          }`}
        >
          {status.text}
        </p>
      )}

      {restored && (
        <button
          onClick={() => window.location.reload()}
          className="mt-2 w-full rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold py-2.5 transition"
        >
          Reload App
        </button>
      )}
    </div>
  )
}
