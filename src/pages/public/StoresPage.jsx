import { useEffect, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { StoreIcon } from 'lucide-react'
import {
  fetchPublicStoreList,
  selectPublicStoreList,
  selectPublicStoreListError,
  selectPublicStoreListPageInfo,
  selectPublicStoreListStatus,
} from '@/store/slices/publicStoreListSlice'
import { STORE_SORT_OPTIONS } from '@/config/catalog'
import { PAGE_SIZE_OPTIONS } from '@/config/constants'
import { useUrlQuery } from '@/hooks/useUrlQuery'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import StoreCard, { StoreCardSkeleton } from '@/components/catalog/StoreCard'
import Button from '@/components/ui/Button'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import Select from '@/components/ui/Select'

const DEFAULTS = { q: '', sort: 'name,asc', page: 0, size: 20 }

export default function StoresPage() {
  const dispatch = useDispatch()
  const [query, setQuery] = useUrlQuery(DEFAULTS)
  const items = useSelector(selectPublicStoreList)
  const pageInfo = useSelector(selectPublicStoreListPageInfo)
  const status = useSelector(selectPublicStoreListStatus)
  const error = useSelector(selectPublicStoreListError)

  const params = useMemo(
    () => ({
      q: query.q.slice(0, 100),
      sort: STORE_SORT_OPTIONS.some((o) => o.value === query.sort) ? query.sort : DEFAULTS.sort,
      page: query.page,
      size: query.size,
    }),
    [query],
  )

  useEffect(() => {
    dispatch(fetchPublicStoreList(params))
  }, [dispatch, params])

  return (
    <>
      <PageHeader title="Stores" description="Shop directly from local sellers." />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <SearchInput value={query.q} onSearch={(q) => setQuery({ q })} placeholder="Search stores" className="flex-1" />
        <Select aria-label="Sort stores" value={params.sort} onChange={(e) => setQuery({ sort: e.target.value })} options={STORE_SORT_OPTIONS} className="sm:w-48" />
      </div>

      <AsyncContent
        status={status}
        error={error}
        onRetry={() => dispatch(fetchPublicStoreList(params))}
        isEmpty={items.length === 0}
        skeleton={
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <StoreCardSkeleton key={i} />
            ))}
          </div>
        }
        empty={
          <EmptyState
            icon={StoreIcon}
            title="No stores found"
            description={query.q ? 'Try another name.' : 'Stores will appear here once they open.'}
            action={query.q && <Button variant="outline" onClick={() => setQuery({ q: '' })}>Show all stores</Button>}
          />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {items.map((store) => (
            <StoreCard key={store.publicId} store={store} />
          ))}
        </div>
        <Pagination
          {...pageInfo}
          sizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={(page) => setQuery({ page }, { resetPage: false })}
          onSizeChange={(size) => setQuery({ size })}
        />
      </AsyncContent>
    </>
  )
}
