import { STATUS_LABELS, STATUS_TONES } from '@/config/enums'
import { humanizeEnum } from '@/utils/format'
import Badge from './Badge'

// Looks up the tone in one enum, or (without `type`) in every enum, first match wins.
function toneFor(value, type) {
  if (type) return STATUS_TONES[type]?.[value] ?? 'neutral'
  for (const map of Object.values(STATUS_TONES)) {
    if (map[value]) return map[value]
  }
  return 'neutral'
}

/**
 * Coloured badge for any enum value from contract section 5.
 * Pass `type` (e.g. "OrderStatus", "ComplaintStatus") when the same value means different things.
 */
export default function StatusBadge({ value, type, label, className }) {
  if (!value) return null
  return (
    <Badge tone={toneFor(value, type)} className={className}>
      {label ?? STATUS_LABELS[value] ?? humanizeEnum(value)}
    </Badge>
  )
}
