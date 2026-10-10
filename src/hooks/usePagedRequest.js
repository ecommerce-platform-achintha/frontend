import { useAsync } from './useAsync'

const EMPTY_PAGE = { page: 0, size: 20, totalElements: 0, totalPages: 0 }

/**
 * A paged list owned by one screen element (a tab, a drawer), without Redux.
 * Re-loads whenever `params` or `scope` changes (compared by value). Pass `params = null` to skip.
 * `scope` is the owner of the list (e.g. the store id) when it is part of the URL, not of `params`.
 *
 * const { items, pageInfo, status, error, reload } = usePagedRequest((p) => api.list(id, p), { page, size }, id)
 */
export function usePagedRequest(fetchPage, params, scope = '') {
  const key = params ? `${scope}:${JSON.stringify(params)}` : null
  const { data, status, error, reload } = useAsync(() => fetchPage(params), key)
  return {
    items: data?.content ?? [],
    pageInfo: data ? { page: data.page ?? 0, size: data.size ?? params?.size, totalElements: data.totalElements ?? 0, totalPages: data.totalPages ?? 0 } : EMPTY_PAGE,
    status,
    error,
    reload,
    data,
  }
}
