// Fake demo items. All names and dates are made up.
// Dates are built relative to today, so the demo always shows green, yellow and red.
import { addMonths, formatDate, todayString, parseDate } from '../utils/warranty.js'

// expiresInDays: roughly how many days from today the warranty ends (negative = already expired).
const DEMO_SPECS = [
  { id: 'demo-tv', name: 'Samsung TV (demo)', warrantyMonths: 24, expiresInDays: -60 },
  { id: 'demo-laptop', name: 'Dell Laptop (demo)', warrantyMonths: 12, expiresInDays: 20 },
  { id: 'demo-phone', name: 'Pixel Phone (demo)', warrantyMonths: 24, expiresInDays: 240 },
  { id: 'demo-fridge', name: 'LG Fridge (demo)', warrantyMonths: 36, expiresInDays: 700 },
  { id: 'demo-earbuds', name: 'Wireless Earbuds (demo)', warrantyMonths: 6, expiresInDays: 5 },
]

export function buildDemoItems(today = todayString()) {
  const base = parseDate(today)
  return DEMO_SPECS.map(({ id, name, warrantyMonths, expiresInDays }) => {
    // purchase date = (today - warranty length) + expiresInDays
    const shifted = addMonths(base, -warrantyMonths)
    shifted.setUTCDate(shifted.getUTCDate() + expiresInDays)
    return { id, name, purchaseDate: formatDate(shifted), warrantyMonths }
  })
}