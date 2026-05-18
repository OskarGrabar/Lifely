// Google Drive backup/restore service.
// Uses the drive.file scope — data is stored as a named JSON file in
// the user's Google Drive root, visible to them and restorable.

const BACKUP_FILE_NAME = 'healthtracker-backup.json'

// All localStorage keys that contain user health data worth backing up.
// Transient state (alarm_firing, snooze) is intentionally excluded.
const BACKUP_KEYS = [
  'ht_metrics',
  'ht_entries',
  'ht_appearances',
  'ht_med_tracker',
  'ht_habits',
  'ht_habit_tracker',
  'ht_goals',
  'ht_current_goal',
  'ht_next_id',
  'ht_alarms',
  'ht_med_names',
]

async function findBackupFile(accessToken) {
  const q = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`)
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`Drive API error: ${res.status}`)
  const { files } = await res.json()
  return files?.[0] ?? null
}

/**
 * Serialises all ht_* localStorage keys to a single JSON file in the
 * user's Drive App Data folder. Creates the file on first backup and
 * updates it on subsequent ones.
 * @returns {string} ISO timestamp of the backup
 */
export async function backupToDrive(accessToken) {
  const data = { _backedUpAt: new Date().toISOString() }
  BACKUP_KEYS.forEach(key => {
    const val = localStorage.getItem(key)
    if (val !== null) data[key] = val
  })

  const existing = await findBackupFile(accessToken)
  const metadata = existing
    ? JSON.stringify({ name: BACKUP_FILE_NAME })
    : JSON.stringify({ name: BACKUP_FILE_NAME })

  const form = new FormData()
  form.append('metadata', new Blob([metadata], { type: 'application/json' }))
  form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }))

  const url = existing
    ? `https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=multipart`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'

  const res = await fetch(url, {
    method: existing ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Backup failed: ${res.status}`)
  return data._backedUpAt
}

/**
 * Downloads the backup file from Drive and writes each key back into
 * localStorage. Call window.location.reload() afterwards to reflect
 * the restored data in the running app.
 * @returns {string|null} ISO timestamp of the restored backup, or null
 */
export async function restoreFromDrive(accessToken) {
  const file = await findBackupFile(accessToken)
  if (!file) throw new Error('No backup found in Google Drive.')

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!res.ok) throw new Error(`Restore failed: ${res.status}`)

  const data = await res.json()
  BACKUP_KEYS.forEach(key => {
    if (data[key] !== undefined) localStorage.setItem(key, data[key])
  })
  return data._backedUpAt ?? null
}
