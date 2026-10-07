import { cn } from '@/utils/cn'
import { SkeletonList } from './Skeleton'

/**
 * Data table that turns into stacked cards below the `md` breakpoint.
 *
 * columns: [{ key, header, render?: (row) => node, className?, hideOnMobile?, primary? }]
 *   - `primary` columns are shown as the card title on mobile.
 * rows: array of objects. rowKey: field name or (row) => key.
 * onRowClick: optional; rows become clickable (and keyboard reachable).
 */
export default function Table({ columns, rows, rowKey = 'publicId', loading = false, empty, onRowClick, caption, className }) {
  const keyOf = (row, index) => (typeof rowKey === 'function' ? rowKey(row) : (row[rowKey] ?? index))
  const cell = (column, row) => (column.render ? column.render(row) : (row[column.key] ?? '—'))

  if (loading) return <SkeletonList rows={5} />
  if (!rows?.length) return empty ?? null

  const clickableProps = (row) =>
    onRowClick
      ? {
          onClick: () => onRowClick(row),
          onKeyDown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onRowClick(row)
            }
          },
          tabIndex: 0,
          role: 'button',
        }
      : {}

  const primaryColumns = columns.filter((c) => c.primary)
  const otherColumns = columns.filter((c) => !c.primary && !c.hideOnMobile)

  return (
    <div className={className}>
      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:border-slate-800 dark:text-slate-400">
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cn('px-4 py-3 whitespace-nowrap', column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, index) => (
              <tr
                key={keyOf(row, index)}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-slate-50 focus-visible:bg-slate-50 dark:hover:bg-slate-800/50 dark:focus-visible:bg-slate-800/50',
                )}
                {...clickableProps(row)}
              >
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-4 py-3.5 align-middle text-slate-700 dark:text-slate-300', column.className)}>
                    {cell(column, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row, index) => (
          <li
            key={keyOf(row, index)}
            className={cn(
              'rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900',
              onRowClick && 'cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/60',
            )}
            {...clickableProps(row)}
          >
            {primaryColumns.length > 0 && (
              <div className="mb-2 font-medium text-slate-900 dark:text-slate-100">
                {primaryColumns.map((column) => (
                  <div key={column.key}>{cell(column, row)}</div>
                ))}
              </div>
            )}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {otherColumns.map((column) => (
                <div key={column.key} className="min-w-0">
                  <dt className="text-xs text-slate-500 dark:text-slate-400">{column.header}</dt>
                  <dd className="truncate text-slate-800 dark:text-slate-200">{cell(column, row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  )
}
