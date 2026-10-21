import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  STORAGE_KEY,
  MAX_ITEMS,
  loadItems,
  saveItems,
  addItem,
  updateItem,
  deleteItem,
  resetDemo,
  cleanItems,
} from './storage.js'
import { buildDemoItems } from '../data/demoItems.js'
import { describeItem } from './warranty.js'

const TODAY = '2026-06-15'

// Tiny in-memory stand-in for localStorage.
function fakeStore(initial = {}) {
  const data = { ...initial }
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = String(v)
    },
    raw: data,
  }
}

test('demo items show all three colours, on any day', () => {
  for (const today of ['2026-06-15', '2026-01-31', '2024-02-29', '2027-12-31']) {
    const statuses = buildDemoItems(today).map((i) => describeItem(i, today).status)
    assert.ok(statuses.includes('green'), today)
    assert.ok(statuses.includes('yellow'), today)
    assert.ok(statuses.includes('red'), today)
  }
})

test('demo items are never dated in the future', () => {
  for (const item of buildDemoItems(TODAY)) assert.ok(item.purchaseDate <= TODAY, item.name)
})

test('first load seeds the demo items and saves them', () => {
  const store = fakeStore()
  const items = loadItems(store, TODAY)
  assert.equal(items.length, 5)
  assert.ok(store.raw[STORAGE_KEY])
})

test('items survive a reload', () => {
  const store = fakeStore()
  const first = loadItems(store, TODAY)
  const added = addItem(first, { name: 'Camera', purchaseDate: '2026-01-01', warrantyMonths: 12 }, TODAY)
  assert.equal(added.ok, true)
  saveItems(added.items, store)
  const again = loadItems(store, TODAY)
  assert.equal(again.length, 6)
  assert.ok(again.some((i) => i.name === 'Camera'))
})

test('deleting everything stays empty (does not re-seed)', () => {
  const store = fakeStore()
  saveItems([], store)
  assert.deepEqual(loadItems(store, TODAY), [])
})

test('corrupted or hostile stored data is handled safely', () => {
  assert.deepEqual(loadItems(fakeStore({ [STORAGE_KEY]: '{not json' }), TODAY), [])
  assert.deepEqual(loadItems(fakeStore({ [STORAGE_KEY]: '"hello"' }), TODAY), [])
  assert.deepEqual(loadItems(fakeStore({ [STORAGE_KEY]: 'x'.repeat(1_000_001) }), TODAY), [])
  const bad = JSON.stringify([
    { id: 'ok-1', name: 'Good', purchaseDate: '2026-01-01', warrantyMonths: 12 },
    { id: '<script>', name: 'Bad id', purchaseDate: '2026-01-01', warrantyMonths: 12 },
    { id: 'ok-2', name: '', purchaseDate: '2026-01-01', warrantyMonths: 12 },
    { id: 'ok-3', name: 'Future', purchaseDate: '2099-01-01', warrantyMonths: 12 },
    { id: 'ok-4', name: 'Months', purchaseDate: '2026-01-01', warrantyMonths: 99999 },
    { id: 'ok-1', name: 'Duplicate id', purchaseDate: '2026-01-01', warrantyMonths: 12 },
    null,
    42,
  ])
  const loaded = loadItems(fakeStore({ [STORAGE_KEY]: bad }), TODAY)
  assert.equal(loaded.length, 1)
  assert.equal(loaded[0].name, 'Good')
})

test('extra fields in stored data are stripped', () => {
  const sneaky = [{ id: 'a1', name: 'TV', purchaseDate: '2026-01-01', warrantyMonths: 12, isAdmin: true, html: '<img onerror=x>' }]
  const [item] = cleanItems(sneaky, TODAY)
  assert.deepEqual(Object.keys(item).sort(), ['id', 'name', 'purchaseDate', 'warrantyMonths'])
})

test('add rejects invalid input and leaves the list unchanged', () => {
  const items = buildDemoItems(TODAY)
  const r = addItem(items, { name: '', purchaseDate: '2099-01-01', warrantyMonths: 0 }, TODAY)
  assert.equal(r.ok, false)
  assert.equal(r.items, items)
})

test('add stops at the item limit', () => {
  const full = Array.from({ length: MAX_ITEMS }, (_, i) => ({
    id: `i-${i}`,
    name: `Item ${i}`,
    purchaseDate: '2026-01-01',
    warrantyMonths: 12,
  }))
  assert.equal(addItem(full, { name: 'One more', purchaseDate: '2026-01-01', warrantyMonths: 12 }, TODAY).ok, false)
})

test('update changes only the chosen item; unknown id is rejected', () => {
  const items = buildDemoItems(TODAY)
  const target = items[1].id
  const r = updateItem(items, target, { name: 'Renamed', purchaseDate: '2026-01-01', warrantyMonths: 6 }, TODAY)
  assert.equal(r.ok, true)
  assert.equal(r.items.find((i) => i.id === target).name, 'Renamed')
  assert.equal(r.items.length, items.length)
  assert.equal(updateItem(items, 'nope', { name: 'X', purchaseDate: '2026-01-01', warrantyMonths: 6 }, TODAY).ok, false)
})

test('delete removes only the chosen item', () => {
  const items = buildDemoItems(TODAY)
  const after = deleteItem(items, items[0].id)
  assert.equal(after.length, items.length - 1)
  assert.ok(!after.some((i) => i.id === items[0].id))
})

test('reset restores the demo items', () => {
  const store = fakeStore()
  saveItems([], store)
  assert.equal(resetDemo(store, TODAY).length, 5)
  assert.equal(loadItems(store, TODAY).length, 5)
})

test('works when storage is unavailable or full', () => {
  assert.equal(loadItems(null, TODAY).length, 5)
  assert.equal(saveItems([], null).ok, false)
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded') } }
  assert.equal(saveItems([], full).ok, false)
})