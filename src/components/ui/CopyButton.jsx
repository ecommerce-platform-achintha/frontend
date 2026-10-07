import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/utils/cn'

// Copies `value` to the clipboard and briefly shows a check mark.
export default function CopyButton({ value, label = 'Copy', className }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return undefined
    const id = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(id)
  }, [copied])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value ?? ''))
      setCopied(true)
    } catch {
      // Clipboard blocked (e.g. insecure context): nothing useful to do.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200',
        className,
      )}
    >
      {copied ? <Check aria-hidden="true" className="size-4 text-success-600" /> : <Copy aria-hidden="true" className="size-4" />}
      <span className="sr-only" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  )
}
