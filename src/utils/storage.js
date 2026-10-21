// Saves items in the browser (localStorage). Nothing leaves the user's device.
// Stored data is treated as untrusted: it is parsed safely and re-validated on every load,
// because anyone can edit localStorage in their browser's developer tools.
import { validateItem, todayString } from './warranty.js'
import { buildDemoItems } from '../data/demoItems.js'

export const STORAGE_KEY = 'warrantywallet:items:v1'
export const MAX_ITEMS = 200
const MAX_STORED_BYTES = 1_000_000 // refuse to parse anything bigger than ~1 MB
const ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/

// Browsers can block or fail storage (private mode, full disk), so access it defensively.
function getDefaultStore() {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function newId() {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

// Keep only well-formed items. Anything invalid or duplicated is dropped.
export function cleanItems(raw, today = todayString()) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const result = []
  for (const entry of raw.slice(0, MAX_ITEMS)) {
    if (!entry || typeof entry !== 'object') continue
    if (typeof entry.id !== 'string' || !ID_PATTERN.test(entry.id) || seen.has(entry.id)) continue
    const checked = validateItem(entry, today)
    if (!checked.ok) continue
    seen.add(entry.id)
    result.push({ id: entry.id, ...checked.value })
  }
  return result
}

// Returns { ok: boolean } so the UI can show an error if saving fails.
export function saveItems(items, store = getDefaultStore()) {
  if (!store) return { ok: false }
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(cleanItems(items)))
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

// First visit (nothing saved yet): load the fake demo items.
// Later visits: load whatever is saved, cleaned. A user who deleted everything stays empty.
export function loadItems(store = getDefaultStore(), today = todayString()) {
  if (!store) return buildDemoItems(today)
  try {
    const text = store.getItem(STORAGE_KEY)
    if (text === null) {
      const demo = buildDemoItems(today)
      saveItems(demo, store)
      return demo
    }
    if (text.length > MAX_STORED_BYTES) return []
    return cleanItems(JSON.parse(text), today)
  } catch {
    return [] // corrupted data: start empty rather than crash
  }
}

export function addItem(items, input, today = todayString()) {
  const checked = validateItem(input, today)
  if (!checked.ok) return { ok: false, errors: checked.errors, items }
  if (items.length >= MAX_ITEMS) {
    return { ok: false, errors: { form: `You can store up to ${MAX_ITEMS} items` }, items }
  }
  return { ok: true, errors: {}, items: [...items, { id: newId(), ...checked.value }] }
}

export function updateItem(items, id, input, today = todayString()) {
  if (!items.some((item) => item.id === id)) {
    return { ok: false, errors: { form: 'Item not found' }, items }
  }
  const checked = validateItem(input, today)
  if (!checked.ok) return { ok: false, errors: checked.errors, items }
  return {
    ok: true,
    errors: {},
    items: items.map((item) => (item.id === id ? { id, ...checked.value } : item)),
  }
}

export function deleteItem(items, id) {
  return items.filter((item) => item.id !== id)
}

// "Reset demo data" button.
export function resetDemo(store = getDefaultStore(), today = todayString()) {
  const demo = buildDemoItems(today)
  saveItems(demo, store)
  return demo
}