// Display helpers. All times come from the server as ISO-8601 UTC and are shown in Sri Lanka time.

export const TIME_ZONE = 'Asia/Colombo'
const LOCALE = 'en-LK'

const moneyFormatter = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'LKR' })

// Formats a server amount. Display only: never use this to compute anything the server charges.
export function formatMoney(amount) {
  if (amount === null || amount === undefined || amount === '') return '—'
  const n = Number(amount)
  return Number.isFinite(n) ? moneyFormatter.format(n) : '—'
}

function toDate(value) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

// "7 Oct 2026"
export function formatDate(value) {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

// "7 Oct 2026, 3:45 pm"
export function formatDateTime(value) {
  const d = toDate(value)
  if (!d) return '—'
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

// Plain dates like holidays ("2026-10-07") have no time zone; format them as-is.
export function formatPlainDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return '—'
  const d = new Date(`${value}T00:00:00Z`)
  return new Intl.DateTimeFormat(LOCALE, { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

const RELATIVE_STEPS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

// "3 hours ago", "in 2 days", "just now"
export function formatRelative(value, now = Date.now()) {
  const d = toDate(value)
  if (!d) return '—'
  const diffSeconds = Math.round((d.getTime() - now) / 1000)
  const abs = Math.abs(diffSeconds)
  if (abs < 45) return 'just now'
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, seconds] of RELATIVE_STEPS) {
    if (abs >= seconds) return rtf.format(Math.round(diffSeconds / seconds), unit)
  }
  return rtf.format(Math.round(diffSeconds / 60), 'minute')
}

// Masks a NIC for display, keeping the last 3 characters: "*********23V".
export function maskNic(nic) {
  if (!nic) return '—'
  const value = String(nic)
  if (value.length <= 3) return value
  return '*'.repeat(value.length - 3) + value.slice(-3)
}

// "AWAITING_MERCHANT" -> "Awaiting merchant"
export function humanizeEnum(value) {
  if (!value) return ''
  const text = String(value).toLowerCase().replace(/_/g, ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Initials for avatar / image fallbacks: "Kamal Perera" -> "KP".
export function initials(text) {
  if (!text) return '?'
  const words = String(text).trim().split(/\s+/).filter(Boolean)
  return (words[0]?.[0] ?? '?').toUpperCase() + (words[1]?.[0] ?? '').toUpperCase()
}

// Sri Lanka has no daylight saving: Colombo is always UTC+05:30.
const COLOMBO_OFFSET = '+05:30'
const COLOMBO_OFFSET_MS = 330 * 60 * 1000

// ISO (UTC) -> "2026-10-07T15:45" for a <input type="datetime-local"> showing Colombo time.
export function toColomboInput(value) {
  const d = toDate(value)
  if (!d) return ''
  return new Date(d.getTime() + COLOMBO_OFFSET_MS).toISOString().slice(0, 16)
}

// "2026-10-07T15:45" typed in Colombo time -> UTC ISO string for the API ('' stays null).
export function fromColomboInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value ?? '')) return null
  const d = new Date(`${value}:00${COLOMBO_OFFSET}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
