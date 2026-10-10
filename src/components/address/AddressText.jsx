// Read-only address block (address book, checkout, order detail).
export default function AddressText({ address, className }) {
  if (!address) return null
  return (
    <address className={className ?? 'text-sm leading-relaxed text-slate-600 not-italic dark:text-slate-300'}>
      <span className="font-medium text-slate-900 dark:text-white">{address.recipientName}</span>
      {address.phone && <span className="text-slate-500 dark:text-slate-400"> · {address.phone}</span>}
      <br />
      {address.line1}
      {address.line2 && (
        <>
          <br />
          {address.line2}
        </>
      )}
      <br />
      {[address.city, address.district, address.postalCode].filter(Boolean).join(', ')}
      {address.country && (
        <>
          <br />
          {address.country}
        </>
      )}
    </address>
  )
}
