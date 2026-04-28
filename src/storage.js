const SUPABASE_URL = 'https://gwohnwolpabyenpdnega.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2hud29scGFieWVucGRuZWdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjc2MjcsImV4cCI6MjA5MjYwMzYyN30.CjQ_uao-vgBTqeUUBZ_bSWka2xDRa5jHXjglMOs4Oj0'
const LOCAL_KEY = 'kilo-data'
const USER_KEY = 'kilo-user-id'
const LEGACY_DEVICE_KEY = 'kilo-device-id'

export function getUserId() {
  return localStorage.getItem(USER_KEY) || null
}

export function setUserId(id) {
  const v = String(id || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 40)
  if (!v) { localStorage.removeItem(USER_KEY); return null }
  localStorage.setItem(USER_KEY, v)
  return v
}

export function getLegacyDeviceId() {
  return localStorage.getItem(LEGACY_DEVICE_KEY) || null
}

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok && res.status !== 404) {
    const err = await res.text()
    throw new Error(`Supabase error ${res.status}: ${err}`)
  }
  if (res.status === 204 || res.status === 404) return null
  return res.json()
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// Try to recover data saved under the legacy random device_id (one-time migration)
async function fetchLegacyData() {
  const legacy = getLegacyDeviceId()
  if (!legacy) return null
  try {
    const rows = await supabaseFetch(`kilo_data?device_id=eq.${encodeURIComponent(legacy)}&select=data`)
    if (rows && rows.length > 0) return rows[0].data
  } catch (e) { /* ignore */ }
  return null
}

export async function loadData() {
  const userId = getUserId()
  const localData = readLocal()

  // No user ID set: localStorage-only mode
  if (!userId) return localData

  try {
    const rows = await supabaseFetch(`kilo_data?device_id=eq.${encodeURIComponent(userId)}&select=data`)
    if (rows && rows.length > 0) {
      const remoteData = rows[0].data
      const remoteTs = remoteData?._savedAt || 0
      const localTs = localData?._savedAt || 0

      if (remoteTs >= localTs) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(remoteData))
        return remoteData
      }
      // Local is more recent — re-push it
      saveData(localData).catch(() => {})
      return localData
    }
    // No remote data for this user yet — try legacy device row to migrate once
    const legacy = await fetchLegacyData()
    if (legacy) {
      const legacyTs = legacy._savedAt || 0
      const localTs = localData?._savedAt || 0
      const best = legacyTs >= localTs ? legacy : localData
      if (best) {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(best))
        saveData(best).catch(() => {})
        return best
      }
    }
  } catch (e) {
    console.warn('Supabase unavailable, using localStorage:', e)
  }
  return localData
}

export async function saveData(data) {
  const userId = getUserId()
  const payload = { ...data, _savedAt: data._savedAt ?? Date.now() }
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(payload)) } catch (e) {}
  if (!userId) return false
  try {
    await supabaseFetch('kilo_data', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ device_id: userId, data: payload, updated_at: new Date().toISOString() }),
    })
    return true
  } catch (e) {
    console.warn('Supabase save failed (data kept in localStorage):', e)
    return false
  }
}

export function exportJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'kilo-data.json'
  a.click()
  URL.revokeObjectURL(url)
}

export async function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try { resolve(JSON.parse(e.target.result)) }
      catch { reject(new Error('Fichier invalide')) }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}
