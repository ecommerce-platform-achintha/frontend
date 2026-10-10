import ErrorState from '@/components/ui/ErrorState'
import { SkeletonList } from '@/components/ui/Skeleton'

/**
 * The three states every data screen needs, in one place:
 * - first load       -> `skeleton` (default: a list skeleton)
 * - failed           -> ErrorState with a retry button
 * - loaded but empty -> `empty` (an EmptyState with a next action)
 * Otherwise renders children. While re-loading data we already have, children stay visible.
 */
export default function AsyncContent({ status, error, onRetry, isEmpty = false, empty = null, skeleton, hasData, children }) {
  const loaded = hasData ?? status === 'succeeded'
  if ((status === 'loading' || status === 'idle') && !loaded) return skeleton ?? <SkeletonList rows={4} />
  if (status === 'failed' && !loaded) return <ErrorState error={error} onRetry={onRetry} />
  if (isEmpty) return empty
  return children
}
