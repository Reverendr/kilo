const SUPABASE_URL = 'https://gwohnwolpabyenpdnega.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2hud29scGFieWVucGRuZWdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjc2MjcsImV4cCI6MjA5MjYwMzYyN30.CjQ_uao-vgBTqeUUBZ_bSWka2xDRa5jHXjglMOs4Oj0'
const LOCAL_KEY = 'kilo-data'
const LEGACY_DEVICE_KEY = 'kilo-device-id'

// Single shared identifier — the app syncs everywhere automatically with no UI.
const DEVICE_ID = 'kilo-shared'

async function supabaseFetch(path, options = {}) {
  const { headers: callerHeaders, ...rest } = options
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...rest,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(callerHeaders || {}),
    },
  })
  if (!res.ok && res.status !== 404) {
    const err = await res.text()
    throw new Error(`Supabase error ${res.status}: ${err}`)
  }
  if (res.status === 204 || res.status === 404) return null
  const ct = res.headers.get('content-type') || ''
  if (!ct.includes('application/json')) return null
  const text = await res.text()
  if (!text) return null
  try { return JSON.parse(text) } catch { return null }
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// Merge two snapshots so concurrent edits across devices aren't lost.
// - logs: union by (date+exo); within a duplicate, the entry with greater ts wins
// - exDB: union by name (newer-snapshot entry wins on conflict)
// - weekPlan, bw: take from whichever snapshot has the greater _savedAt
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
    if ((l.ts || 0) > (cur.ts || 0)) logsMap.set(k, l)
  }
  ;(newer.logs || []).forEach(addLog)
  ;(older.logs || []).forEach(addLog)

  const exMap = new Map()
  ;(newer.exDB || []).forEach(e => exMap.set(e.name, e))
  ;(older.exDB || []).forEach(e => { if (!exMap.has(e.name)) exMap.set(e.name, e) })

  return {
    ...newer,
    logs: Array.from(logsMap.values()),
    exDB: exMap.size ? Array.from(exMap.values()) : (newer.exDB || older.exDB),
    weekPlan: newer.weekPlan || older.weekPlan,
    bw: newer.bw != null ? newer.bw : older.bw,
    _savedAt: Math.max(aAt, bAt),
  }
}

async function fetchRemote() {
  const rows = await supabaseFetch(`kilo_data?device_id=eq.${encodeURIComponent(DEVICE_ID)}&select=data&order=updated_at.desc&limit=1`)
  return rows && rows.length > 0 ? rows[0].data : null
}

// One-time migration: pull data from a previous random per-device row if any.
async function fetchLegacyData() {
  const legacy = localStorage.getItem(LEGACY_DEVICE_KEY)
  if (!legacy || legacy === DEVICE_ID) return null
  try {
    const rows = await supabaseFetch(`kilo_data?device_id=eq.${encodeURIComponent(legacy)}&select=data&order=updated_at.desc&limit=1`)
    if (rows && rows.length > 0) return rows[0].data
  } catch (e) { /* ignore */ }
  return null
}

export async function loadData() {
  const localData = readLocal()
  try {
    let remote = await fetchRemote()
    if (!remote) {
      const legacy = await fetchLegacyData()
      if (legacy) remote = legacy
    }
    const merged = mergeData(localData, remote)
    if (merged) {
      const stamped = { ...merged, _savedAt: merged._savedAt || Date.now() }
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(stamped)) } catch {}
      // If our merge produced something different from what's on the server, push it back so
      // every other device converges to the union on their next pull.
      const localCount = (localData?.logs || []).length
      const remoteCount = (remote?.logs || []).length
      const mergedCount = (merged.logs || []).length
      if (mergedCount > remoteCount || mergedCount > localCount || !remote) {
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
  const payload = { ...data, _savedAt: data._savedAt ?? Date.now() }
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(payload)) } catch (e) {}
  try {
    // Proper UPSERT — relies on UNIQUE/PK on device_id (PostgREST resolution=merge-duplicates)
    await supabaseFetch('kilo_data?on_conflict=device_id', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ device_id: DEVICE_ID, data: payload, updated_at: new Date().toISOString() }),
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
