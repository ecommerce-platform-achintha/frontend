import { useDispatch, useSelector } from 'react-redux'
import { Info, TriangleAlert, X } from 'lucide-react'
import { bannerDismissed, selectBanners } from '@/store/slices/uiSlice'
import { cn } from '@/utils/cn'

const styles = {
  info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200',
  warning: 'border-warning-200 bg-warning-50 text-warning-900 dark:border-warning-500/30 dark:bg-warning-500/10 dark:text-warning-200',
  danger: 'border-danger-200 bg-danger-50 text-danger-900 dark:border-danger-500/30 dark:bg-danger-500/10 dark:text-danger-200',
}

// App-wide dismissible banners from the ui slice (e.g. "You are offline").
export default function GlobalBanners() {
  const banners = useSelector(selectBanners)
  const dispatch = useDispatch()
  if (!banners.length) return null
  return (
    <div>
      {banners.map((banner) => (
        <div key={banner.id} role="status" className={cn('border-b', styles[banner.type] ?? styles.info)}>
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
            {banner.type === 'info' ? <Info aria-hidden="true" className="size-4 shrink-0" /> : <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />}
            <p className="flex-1">{banner.message}</p>
            <button
              type="button"
              onClick={() => dispatch(bannerDismissed(banner.id))}
              aria-label="Dismiss"
              className="rounded-md p-1 opacity-70 hover:opacity-100"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
