import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronDown, LayoutGrid } from 'lucide-react'
import { fetchCategories, selectCategoriesStatus, selectCategoryTree } from '@/store/slices/categoriesSlice'
import { useClickOutside } from '@/hooks/useClickOutside'
import Skeleton from '@/components/ui/Skeleton'

// "Categories" dropdown in the header. Links to /search?category=<slug> (parents include children).
export default function CategoriesMenu() {
  const dispatch = useDispatch()
  const tree = useSelector(selectCategoryTree)
  const status = useSelector(selectCategoriesStatus)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close, open)

  useEffect(() => {
    dispatch(fetchCategories())
  }, [dispatch])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <LayoutGrid aria-hidden="true" className="size-4" />
        <span className="hidden lg:inline">Categories</span>
        <span className="sr-only lg:hidden">Categories</span>
        <ChevronDown aria-hidden="true" className="size-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-2 max-h-[70dvh] w-[min(90vw,40rem)] animate-fade-in overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-pop dark:border-slate-700 dark:bg-slate-900">
          {status === 'loading' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-5 w-2/3" />
              ))}
            </div>
          )}
          {status === 'failed' && <p className="text-sm text-slate-500">Categories could not be loaded.</p>}
          {status === 'succeeded' && tree.length === 0 && <p className="text-sm text-slate-500">No categories yet.</p>}
          {tree.length > 0 && (
            <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {tree.map((parent) => (
                <li key={parent.slug}>
                  <Link
                    to={`/search?category=${encodeURIComponent(parent.slug)}`}
                    onClick={close}
                    className="text-sm font-semibold text-slate-900 hover:text-primary-700 dark:text-white dark:hover:text-primary-300"
                  >
                    {parent.name}
                  </Link>
                  {parent.children.length > 0 && (
                    <ul className="mt-1.5 space-y-1">
                      {parent.children.map((child) => (
                        <li key={child.slug}>
                          <Link
                            to={`/search?category=${encodeURIComponent(child.slug)}`}
                            onClick={close}
                            className="text-sm text-slate-600 hover:text-primary-700 dark:text-slate-400 dark:hover:text-primary-300"
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
