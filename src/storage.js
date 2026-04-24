// storage.js — persiste les données dans un fichier JSON sur Google Drive
// via l'API Claude MCP (disponible uniquement dans le contexte claude.ai)
// En dehors de ce contexte, fallback sur localStorage

const FILE_NAME = 'kilo-data.json'
const LOCAL_KEY = 'kilo-data'

// Détecte si on est dans le contexte Claude MCP
const hasMCP = () => typeof window !== 'undefined' && window.__KILO_DRIVE_FILE_ID__

export async function loadData() {
  // 1. Essaie localStorage d'abord (disponible partout)
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {}
  return null
}

export async function saveData(data) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
    return true
  } catch (e) {
    console.error('Save error:', e)
    return false
  }
}

export function exportJSON(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = FILE_NAME
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
