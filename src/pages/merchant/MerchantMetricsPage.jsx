import * as storesApi from '@/api/stores'
import { METRIC_FIELDS } from '@/config/merchant'
import { useAsync } from '@/hooks/useAsync'
import { formatDateTime } from '@/utils/format'
import PageHeader from '@/components/common/PageHeader'
import MetricTile from '@/components/merchant/MetricTile'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'

export default function MerchantMetricsPage() {
  const { data, status, error, reload } = useAsync(() => storesApi.getMyMetrics(), 'metrics')

  return (
    <>
      <PageHeader
        title="Metrics"
        description={data?.updatedAt ? `Calculated by the marketplace. Last updated ${formatDateTime(data.updatedAt)}.` : 'Calculated by the marketplace.'}
      />
      {status === 'failed' ? (
        <ErrorState error={error} onRetry={reload} />
      ) : status !== 'succeeded' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METRIC_FIELDS.map((f) => (
            <Skeleton key={f.key} className="h-28" />
          ))}
        </div>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METRIC_FIELDS.map((f) => (
            <MetricTile key={f.key} field={f} value={data?.[f.key]} showHelp />
          ))}
        </dl>
      )}
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">“n/a” means there is not enough data yet, for example a rate before your first order.</p>
    </>
  )
}
