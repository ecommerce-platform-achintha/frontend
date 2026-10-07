import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

// items: [{ label, to? }]. The last item is the current page (no link).
export default function Breadcrumbs({ items }) {
  if (!items?.length) return null
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
        {items.map((item, index) => {
          const last = index === items.length - 1
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li>
                {item.to && !last ? (
                  <Link to={item.to} className="rounded hover:text-slate-900 hover:underline dark:hover:text-slate-100">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined} className={last ? 'font-medium text-slate-800 dark:text-slate-200' : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
              {!last && (
                <li aria-hidden="true">
                  <ChevronRight className="size-3.5" />
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
