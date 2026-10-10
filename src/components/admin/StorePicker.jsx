import { useState } from 'react'
import { Store } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { useAsync } from '@/hooks/useAsync'
import { useDebounce } from '@/hooks/useDebounce'
import { cn } from '@/utils/cn'
import Input from '@/components/ui/Input'
import Skeleton from '@/components/ui/Skeleton'

const RESULTS = 10

/**
 * Finds a store by name through GET /api/admin/stores?q= and returns it via onSelect(store).
 * `selectedId` highlights the chosen store (STR-...).
 */
export default function StorePicker({ selectedId, onSelect, label = 'Find a store' }) {
  const [text, setText] = useState('')
  const q = useDebounce(text.trim(), 300)
  const { data, status } = useAsync(() => adminApi.listStores({ q: q || undefined, size: RESULTS, sort: 'name,asc' }), `stores:${q}`)
  const stores = data?.content ?? []

  return (
    <div className="space-y-2">
      <Input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Store name" aria-label={label} maxLength={100} />
      {status === 'loading' && !data ? (
        <Skeleton className="h-24 w-full" />
      ) : stores.length === 0 ? (
        <p className="text-sm text-slate-500">No stores match.</p>
      ) : (
        <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {stores.map((s) => (
            <li key={s.publicId}>
              <button
                type="button"
                onClick={() => onSelect(s)}
                aria-pressed={s.publicId === selectedId}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/60',
                  s.publicId === selectedId && 'bg-primary-50 dark:bg-primary-500/10',
                )}
              >
                <Store aria-hidden="true" className="size-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                <span className="font-mono text-xs text-slate-500">{s.publicId}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
