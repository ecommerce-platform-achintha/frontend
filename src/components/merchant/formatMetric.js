import { formatMoney } from '@/utils/format'

const numberFormat = new Intl.NumberFormat('en-LK', { maximumFractionDigits: 1 })

// Shows a metric exactly as returned; null or missing values (e.g. rates with no orders yet) are "n/a".
export function formatMetric(kind, value) {
  if (value === null || value === undefined || value === '') return 'n/a'
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value)
  switch (kind) {
    case 'money':
      return formatMoney(n)
    case 'percent':
      return `${numberFormat.format(n)}%`
    case 'minutes':
      return n >= 120 ? `${numberFormat.format(n / 60)} h` : `${numberFormat.format(n)} min`
    default:
      return numberFormat.format(n)
  }
}
