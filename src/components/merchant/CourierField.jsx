import { Link } from 'react-router-dom'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

/**
 * Courier picker for the quote and ship forms.
 *
 * The owner gets a select from GET /api/merchant/owner/couriers. That endpoint is OWNER ONLY
 * (the gateway sends /api/merchant/owner/** to merchants only), and the contract has no courier
 * list an assistant may read. So assistants type the courier code, we check its format, and the
 * server answers COURIER_NOT_AVAILABLE when the code is not one of the store's couriers (or does
 * not support cash on delivery for a COD order).
 *
 * couriers: array from the owner endpoint, or null for assistants.
 */
export default function CourierField({ couriers, codOnly = false, value, onChange, error, label = 'Courier' }) {
  if (!couriers) {
    return (
      <FormField
        label={label}
        required
        error={error}
        hint={`Type the courier code your store uses, for example DOMEX.${codOnly ? ' This is a cash on delivery order, so the courier must support COD.' : ''}`}
      >
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase().replace(/\s+/g, ''))}
          maxLength={20}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="DOMEX"
        />
      </FormField>
    )
  }

  const options = couriers
    .filter((c) => c.active !== false && (!codOnly || c.codSupported))
    .map((c) => ({ value: c.code, label: `${c.name ?? c.code}${c.codSupported ? ' · COD' : ''}` }))

  return (
    <FormField
      label={label}
      required
      error={error}
      hint={
        options.length === 0 ? (
          <>
            {codOnly ? 'None of your couriers supports cash on delivery.' : 'You have no couriers enabled.'}{' '}
            <Link to="/merchant/shipping" className="font-medium text-primary-700 underline dark:text-primary-300">
              Choose couriers
            </Link>
          </>
        ) : codOnly ? (
          'Only couriers that support cash on delivery are listed.'
        ) : undefined
      }
    >
      <Select value={value} onChange={(e) => onChange(e.target.value)} options={options} placeholder="Choose a courier" />
    </FormField>
  )
}
