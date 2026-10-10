import { useUrlQuery } from '@/hooks/useUrlQuery'
import { isPublicId } from '@/utils/ids'
import StoreLedger from '@/components/admin/StoreLedger'
import StorePicker from '@/components/admin/StorePicker'
import PageHeader from '@/components/common/PageHeader'
import Card from '@/components/ui/Card'

const DEFAULTS = { store: '', name: '' }

// SUPER ADMIN: pick a store, see its fee ledger and grant credits.
export default function AdminCreditsPage() {
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const storeId = isPublicId(query.store, 'STR') ? query.store : null

  return (
    <>
      <PageHeader title="Credits" description="Fee ledgers per store. Fees are recorded but not charged; credits are added to the ledger." />
      <div className="space-y-6">
        <Card>
          <Card.Header title="Choose a store" description="Search by store name." />
          <Card.Body>
            <StorePicker selectedId={storeId} onSelect={(s) => setQuery({ store: s.publicId, name: s.name })} />
          </Card.Body>
        </Card>
        {storeId && (
          <section aria-label="Ledger" className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {query.name || 'Store'} <span className="font-mono text-sm font-normal text-slate-500">{storeId}</span>
            </h2>
            <StoreLedger key={storeId} storePublicId={storeId} />
          </section>
        )}
      </div>
    </>
  )
}
