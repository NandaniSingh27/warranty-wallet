import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateExpiry,
  daysLeft,
  getStatus,
  validateItem,
  describeItem,
  parseDate,
} from './warranty.js'

test('adds months normally', () => {
  assert.equal(calculateExpiry('2025-01-15', 12), '2026-01-15')
  assert.equal(calculateExpiry('2025-06-10', 6), '2025-12-10')
})

test('crosses year boundaries', () => {
  assert.equal(calculateExpiry('2025-11-20', 3), '2026-02-20')
  assert.equal(calculateExpiry('2024-12-31', 24), '2026-12-31')
})

test('month-end purchases clamp to the last day', () => {
  assert.equal(calculateExpiry('2025-01-31', 1), '2025-02-28')
  assert.equal(calculateExpiry('2025-03-31', 1), '2025-04-30')
  assert.equal(calculateExpiry('2025-08-31', 6), '2026-02-28')
})

test('leap years', () => {
  assert.equal(calculateExpiry('2024-01-31', 1), '2024-02-29')
  assert.equal(calculateExpiry('2024-02-29', 12), '2025-02-28')
  assert.equal(calculateExpiry('2024-02-29', 48), '2028-02-29')
})

test('rejects bad dates', () => {
  for (const bad of ['2025-02-30', '2025-13-01', '2025-1-1', '25-01-01', '', 'abc', '2025-01-01T00:00']) {
    assert.throws(() => parseDate(bad), RangeError, bad)
  }
  assert.throws(() => parseDate(null), TypeError)
  assert.throws(() => parseDate(20250101), TypeError)
})

test('rejects bad warranty lengths', () => {
  for (const bad of [0, -1, 1.5, 121, NaN, Infinity, '12', null, undefined]) {
    assert.throws(() => calculateExpiry('2025-01-01', bad), RangeError, String(bad))
  }
})

test('daysLeft counts whole days', () => {
  assert.equal(daysLeft('2026-01-10', '2026-01-10'), 0)
  assert.equal(daysLeft('2026-01-11', '2026-01-10'), 1)
  assert.equal(daysLeft('2026-01-09', '2026-01-10'), -1)
  assert.equal(daysLeft('2026-03-01', '2026-02-01'), 28)
})

test('daysLeft is not affected by daylight saving changes', () => {
  assert.equal(daysLeft('2026-03-30', '2026-03-28'), 2)
  assert.equal(daysLeft('2026-11-02', '2026-10-31'), 2)
})

test('status thresholds', () => {
  assert.equal(getStatus(31), 'green')
  assert.equal(getStatus(30), 'yellow')
  assert.equal(getStatus(1), 'yellow')
  assert.equal(getStatus(0), 'yellow')
  assert.equal(getStatus(-1), 'red')
  assert.throws(() => getStatus(1.5), TypeError)
  assert.throws(() => getStatus('5'), TypeError)
})

test('validateItem accepts good input and trims the name', () => {
  const r = validateItem({ name: '  Samsung TV  ', purchaseDate: '2025-01-01', warrantyMonths: '24' }, '2026-01-01')
  assert.equal(r.ok, true)
  assert.deepEqual(r.value, { name: 'Samsung TV', purchaseDate: '2025-01-01', warrantyMonths: 24 })
})

test('validateItem rejects bad input', () => {
  const today = '2026-01-01'
  assert.equal(validateItem({ name: '', purchaseDate: '2025-01-01', warrantyMonths: 12 }, today).errors.name !== undefined, true)
  assert.equal(validateItem({ name: 'x'.repeat(101), purchaseDate: '2025-01-01', warrantyMonths: 12 }, today).errors.name !== undefined, true)
  assert.equal(validateItem({ name: 'TV', purchaseDate: '2026-01-02', warrantyMonths: 12 }, today).errors.purchaseDate !== undefined, true)
  assert.equal(validateItem({ name: 'TV', purchaseDate: 'nope', warrantyMonths: 12 }, today).errors.purchaseDate !== undefined, true)
  assert.equal(validateItem({ name: 'TV', purchaseDate: '2025-01-01', warrantyMonths: -5 }, today).errors.warrantyMonths !== undefined, true)
  assert.equal(validateItem(null, today).ok, false)
  assert.equal(validateItem('hello', today).ok, false)
})

test('validateItem allows a purchase made today', () => {
  assert.equal(validateItem({ name: 'TV', purchaseDate: '2026-01-01', warrantyMonths: 12 }, '2026-01-01').ok, true)
})

test('describeItem gives the three colours', () => {
  const today = '2026-06-01'
  assert.equal(describeItem({ name: 'TV', purchaseDate: '2023-01-01', warrantyMonths: 24 }, today).status, 'red')
  assert.equal(describeItem({ name: 'Laptop', purchaseDate: '2025-06-21', warrantyMonths: 12 }, today).status, 'yellow')
  assert.equal(describeItem({ name: 'Phone', purchaseDate: '2026-01-01', warrantyMonths: 24 }, today).status, 'green')
})