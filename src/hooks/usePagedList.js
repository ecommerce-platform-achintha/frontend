import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

/**
 * Loads one createPagedResource list with `params` and re-loads when they change.
 * `params` must be memoised (useMemo) and list every filter key, so a cleared filter
 * overrides the one remembered by the slice.
 *
 * const { items, pageInfo, status, error, reload } = usePagedList(merchantLists.orders, params)
 * Pass `params = null` to skip loading.
 */
export function usePagedList(resource, params) {
  const dispatch = useDispatch()
  const { selectItems, selectPageInfo, selectStatus, selectError } = resource.selectors
  const items = useSelector(selectItems)
  const pageInfo = useSelector(selectPageInfo)
  const status = useSelector(selectStatus)
  const error = useSelector(selectError)

  const reload = useCallback(() => {
    if (params) dispatch(resource.fetchList(params))
  }, [dispatch, resource, params])

  useEffect(() => {
    reload()
  }, [reload])

  return { items, pageInfo, status, error, reload }
}
