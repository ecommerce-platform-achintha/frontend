import { useCallback } from 'react'
import * as ordersApi from '@/api/orders'
import { ORDER_CHANGED_CODES } from '@/store/slices/customerOrderSlice'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { useWindowFocus } from '@/hooks/useWindowFocus'

const looksLikeOrder = (data, publicId) => data && typeof data === 'object' && data.publicId === publicId && data.status

/**
 * One merchant order (page-local) and a runner for its actions.
 * `act(call)` runs an action and replaces the order with the response. The contract does not say
 * what every action returns, so when the answer is not the order itself we reload it.
 * On INVALID_ORDER_STATE / CONCURRENT_MODIFICATION it reloads and tells the user, then rethrows
 * so the form or dialog can stay open with the message.
 */
export function useMerchantOrder(publicId) {
  const toast = useToast()
  const { data: order, error, status, reload, setData } = useAsync(() => ordersApi.getMerchantOrder(publicId), publicId)

  // No polling: refresh when the user comes back to the tab.
  useWindowFocus(reload)

  const act = useCallback(
    async (call) => {
      try {
        const data = await call()
        if (looksLikeOrder(data, publicId)) setData(data)
        else setData(await ordersApi.getMerchantOrder(publicId))
      } catch (err) {
        if (ORDER_CHANGED_CODES.includes(err?.code)) {
          toast.warning('This order changed while you were looking at it. We reloaded the latest version.')
          reload()
        }
        throw err
      }
    },
    [publicId, setData, reload, toast],
  )

  return { order, error, status, reload, act }
}
