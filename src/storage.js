// storage.js — Supabase backend pour la persistance multi-device
// Les données sont identifiées par un device_id unique généré localement

const SUPABASE_URL = 'https://gwohnwolpabyenpdnega.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3b2hud29scGFieWVucGRuZWdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcwMjc2MjcsImV4cCI6MjA5MjYwMzYyN30.CjQ_uao-vgBTqeUUBZ_bSWka2xDRa5jHXjglMOs4Oj0'
const LOCAL_KEY = 'kilo-data'
const DEVICE_KEY = 'kilo-device-id'

// Génère ou récupère un device_id unique et stable
function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
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

export async function loadData() {
  const deviceId = getDeviceId()
  try {
    // Essaie Supabase en priorité
    const rows = await supabaseFetch(`kilo_data?device_id=eq.${encodeURIComponent(deviceId)}&select=data`)
    if (rows && rows.length > 0) {
      // Synchronise aussi localStorage comme cache
      localStorage.setItem(LOCAL_KEY, JSON.stringify(rows[0].data))
      return rows[0].data
    }
  } catch (e) {
    console.warn('Supabase unavailable, falling back to localStorage:', e)
  }
  // Fallback localStorage (offline)
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return null
}

export async function saveData(data) {
  const deviceId = getDeviceId()
  // Sauvegarde localStorage en premier (immédiat, offline-first)
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)) } catch (e) {}
  // Puis Supabase (upsert)
  try {
    await supabaseFetch('kilo_data', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ device_id: deviceId, data, updated_at: new Date().toISOString() }),
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

// Retourne le device_id pour l'afficher dans les settings
export function getDeviceInfo() {
  return { deviceId: getDeviceId() }
}
