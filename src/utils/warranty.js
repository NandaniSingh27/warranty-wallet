export const MAX_NAME_LENGTH = 100
export const MIN_MONTHS = 1
export const MAX_MONTHS = 120 // 10 years
export const WARNING_DAYS = 30

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const MS_PER_DAY = 86_400_000

// Parse 'YYYY-MM-DD' strictly. Rejects impossible dates such as 2025-02-30.
export function parseDate(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Date must be a string in YYYY-MM-DD format')
  }
  const match = DATE_PATTERN.exec(value)
  if (!match) {
    throw new RangeError('Date must be in YYYY-MM-DD format')
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new RangeError('Date does not exist')
  }
  return date
}

export function formatDate(date) {
  const y = String(date.getUTCFullYear()).padStart(4, '0')
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Today's date as 'YYYY-MM-DD' in the user's local calendar.
export function todayString(now = new Date()) {
  const y = String(now.getFullYear()).padStart(4, '0')
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Add months and clamp to the last day of the month when needed.
// Example: 31 Jan + 1 month = 28 Feb (or 29 Feb in a leap year), not 3 March.
export function addMonths(date, months) {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + months
  const day = date.getUTCDate()
  const lastDayOfTarget = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(day, lastDayOfTarget)))
}

export function isValidMonths(months) {
  return Number.isInteger(months) && months >= MIN_MONTHS && months <= MAX_MONTHS
}

// Returns the expiry date as 'YYYY-MM-DD'.
export function calculateExpiry(purchaseDate, warrantyMonths) {
  if (!isValidMonths(warrantyMonths)) {
    throw new RangeError(`Warranty must be a whole number from ${MIN_MONTHS} to ${MAX_MONTHS} months`)
  }
  return formatDate(addMonths(parseDate(purchaseDate), warrantyMonths))
}

// Whole days from `today` until expiry. Negative means already expired.
export function daysLeft(expiryDate, today = todayString()) {
  return Math.round((parseDate(expiryDate) - parseDate(today)) / MS_PER_DAY)
}

// 'green' = more than 30 days left, 'yellow' = 0 to 30 days left, 'red' = expired.
// Expiry day itself still counts as valid (0 days left = yellow).
export function getStatus(days) {
  if (!Number.isInteger(days)) {
    throw new TypeError('days must be a whole number')
  }
  if (days < 0) return 'red'
  if (days <= WARNING_DAYS) return 'yellow'
  return 'green'
}

// Validate and clean form input. Returns { ok, errors, value }.
// Always re-run this on data loaded from storage too, never trust it blindly.
export function validateItem(input, today = todayString()) {
  const errors = {}
  const source = input && typeof input === 'object' ? input : {}

  const name = typeof source.name === 'string' ? source.name.trim() : ''
  if (name.length === 0) errors.name = 'Name is required'
  else if (name.length > MAX_NAME_LENGTH) errors.name = `Name must be ${MAX_NAME_LENGTH} characters or fewer`

  let purchaseDate = source.purchaseDate
  try {
    parseDate(purchaseDate)
    if (purchaseDate > today) errors.purchaseDate = 'Purchase date cannot be in the future'
  } catch {
    errors.purchaseDate = 'Enter a valid date'
  }

  const warrantyMonths = Number(source.warrantyMonths)
  if (!isValidMonths(warrantyMonths)) {
    errors.warrantyMonths = `Enter a whole number from ${MIN_MONTHS} to ${MAX_MONTHS}`
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors, value: null }
  return { ok: true, errors: {}, value: { name, purchaseDate, warrantyMonths } }
}

// Everything the UI needs for one item.
export function describeItem(item, today = todayString()) {
  const expiryDate = calculateExpiry(item.purchaseDate, item.warrantyMonths)
  const days = daysLeft(expiryDate, today)
  return { ...item, expiryDate, daysLeft: days, status: getStatus(days) }
}