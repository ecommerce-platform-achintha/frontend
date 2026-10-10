import { Link } from 'react-router-dom'
import * as adminApi from '@/api/admin'
import { useAsync } from '@/hooks/useAsync'
import { formatDate, formatDateTime, humanizeEnum } from '@/utils/format'
import Badge from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'

// GET /api/admin/customers/{USR-...}/score: score, COD refusals and suspension, recent events.
export default function CustomerScoreCard({ customerPublicId, showUserLink = false }) {
  const { data, status, error, reload } = useAsync(() => adminApi.getCustomerScore(customerPublicId), customerPublicId || null)

  return (
    <Card>
      <Card.Header
        title="Customer score"
        actions={
          showUserLink && (
            <Link to={`/admin/users/${customerPublicId}`} className="text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300">
              Open account
            </Link>
          )
        }
      />
      <Card.Body className="space-y-4 text-sm">
        {status === 'failed' ? (
          <ErrorState error={error} onRetry={reload} />
        ) : !data ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Score</dt>
                <dd className="text-lg font-semibold tabular-nums">{data.score ?? 'n/a'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">COD refusals</dt>
                <dd className="text-lg font-semibold tabular-nums">{data.codRefusals ?? 0}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Toward suspension</dt>
                <dd className="text-lg font-semibold tabular-nums">{data.codRefusalsTowardSuspension ?? 0}</dd>
              </div>
            </dl>
            {data.codSuspended ? (
              <Badge tone="danger">COD suspended{data.codSuspendedUntil ? ` until ${formatDate(data.codSuspendedUntil)}` : ''}</Badge>
            ) : (
              <Badge tone="success">COD allowed</Badge>
            )}
            <div>
              <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Recent events</h3>
              {data.recentEvents?.length ? (
                <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                  {data.recentEvents.map((e, i) => (
                    <li key={`${e.type}-${e.createdAt}-${i}`} className="flex justify-between gap-3 py-1.5">
                      <span>{humanizeEnum(e.type)}</span>
                      <span className="flex gap-3 tabular-nums">
                        <span className={Number(e.delta) < 0 ? 'text-danger-600' : 'text-success-700'}>
                          {Number(e.delta) > 0 ? `+${e.delta}` : e.delta}
                        </span>
                        <span className="text-slate-500">{formatDateTime(e.createdAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-slate-500">No recent events.</p>
              )}
            </div>
          </>
        )}
      </Card.Body>
    </Card>
  )
}
