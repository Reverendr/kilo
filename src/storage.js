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
    const rows = await supabaseFetch(`kilo_data?device_id=eq.${encodeURIComponent(legacy)}&select=data&order=updated_at.desc&limit=1`)
    if (rows && rows.length > 0) return rows[0].data
  } catch (e) { /* ignore */ }
  return null
}

// Merge two snapshots so that concurrent device edits aren't lost.
// - logs: union by (date+exo); within a duplicate, the one with greater ts wins (else any)
// - exDB: union by name (existing entry wins, since customizations rarely conflict)
// - weekPlan, bw: take from the snapshot with greater _savedAt
function mergeData(a, b) {
  if (!a) return b || null
  if (!b) return a
  const aAt = a._savedAt || 0
  const bAt = b._savedAt || 0
  const newer = aAt >= bAt ? a : b
  const older = aAt >= bAt ? b : a

  const logsMap = new Map()
  const addLog = l => {
    if (!l || !l.date || !l.exo) return
    const k = l.date + '|' + l.exo
    const cur = logsMap.get(k)
    if (!cur) { logsMap.set(k, l); return }
    const lt = l.ts || 0, ct = cur.ts || 0
    if (lt > ct) logsMap.set(k, l)
  }
  ;(newer.logs || []).forEach(addLog)
  ;(older.logs || []).forEach(addLog)
  const logs = Array.from(logsMap.values())

  const exMap = new Map()
  ;(newer.exDB || []).forEach(e => exMap.set(e.name, e))
  ;(older.exDB || []).forEach(e => { if (!exMap.has(e.name)) exMap.set(e.name, e) })
  const exDB = exMap.size ? Array.from(exMap.values()) : (newer.exDB || older.exDB)

  return {
    ...newer,
    logs,
    exDB,
    weekPlan: newer.weekPlan || older.weekPlan,
    bw: newer.bw != null ? newer.bw : older.bw,
    _savedAt: Math.max(aAt, bAt),
  }
}

async function fetchRemote(userId) {
  const rows = await supabaseFetch(`kilo_data?device_id=eq.${encodeURIComponent(userId)}&select=data&order=updated_at.desc&limit=1`)
  return rows && rows.length > 0 ? rows[0].data : null
}

export async function loadData() {
  const userId = getUserId()
  const localData = readLocal()

  // No user ID set: localStorage-only mode
  if (!userId) return localData

  try {
    let remote = await fetchRemote(userId)
    // No remote data yet → check legacy random-device row for one-time migration
    if (!remote) {
      const legacy = await fetchLegacyData()
      if (legacy) remote = legacy
    }
    const merged = mergeData(localData, remote)
    if (merged) {
      const stamped = { ...merged, _savedAt: merged._savedAt || Date.now() }
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(stamped)) } catch {}
      // Push merged snapshot back so every device converges to the union
      const localCount = (localData?.logs || []).length
      const remoteCount = (remote?.logs || []).length
      const mergedCount = (merged.logs || []).length
      if (mergedCount > localCount || mergedCount > remoteCount || !remote) {
        saveData(stamped).catch(() => {})
      }
      return stamped
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
    // Ensure exactly one row per user_id by deleting any existing rows first
    await supabaseFetch(`kilo_data?device_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' })
    await supabaseFetch('kilo_data', {
      method: 'POST',
      headers: { 'Prefer': 'return=minimal' },
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
