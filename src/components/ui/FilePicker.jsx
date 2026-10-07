import { useEffect, useId, useRef, useState } from 'react'
import { FileText, Paperclip, X } from 'lucide-react'
import { createStorageKey } from '@/utils/storageKeys'
import { cn } from '@/utils/cn'
import SmartImage from '@/components/common/SmartImage'
import SimulatedUploadNotice from '@/components/common/SimulatedUploadNotice'
import { focusRing } from './styles'

/**
 * Picks files and turns each into a simulated storage key (nothing is uploaded).
 * Controlled by `value` (array of keys) + `onChange(keys)`.
 * Local previews are kept only for files picked in this session.
 */
export default function FilePicker({
  value = [],
  onChange,
  maxFiles = 10,
  minFiles = 0,
  accept = 'image/*',
  folder = 'uploads',
  label = 'Add files',
  invalid = false,
  disabled = false,
  id,
  'aria-describedby': describedBy,
}) {
  const inputRef = useRef(null)
  const autoId = useId()
  const inputId = id ?? autoId
  // key -> { name, previewUrl, isImage } for files picked in this session.
  const [local, setLocal] = useState({})
  const localRef = useRef(local)
  useEffect(() => {
    localRef.current = local
  }, [local])

  // Free object URLs when the component unmounts.
  useEffect(
    () => () => {
      Object.values(localRef.current).forEach((f) => f.previewUrl && URL.revokeObjectURL(f.previewUrl))
    },
    [],
  )

  const remaining = Math.max(0, maxFiles - value.length)

  const onFiles = (event) => {
    const files = Array.from(event.target.files ?? []).slice(0, remaining)
    event.target.value = '' // allow picking the same file again
    if (!files.length) return
    const added = {}
    const keys = files.map((file) => {
      const key = createStorageKey(file.name, folder)
      const isImage = file.type.startsWith('image/')
      added[key] = { name: file.name, isImage, previewUrl: isImage ? URL.createObjectURL(file) : null }
      return key
    })
    setLocal((prev) => ({ ...prev, ...added }))
    onChange?.([...value, ...keys])
  }

  const remove = (key) => {
    const entry = local[key]
    if (entry?.previewUrl) URL.revokeObjectURL(entry.previewUrl)
    setLocal((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    onChange?.(value.filter((k) => k !== key))
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {value.map((key) => {
            const entry = local[key]
            const name = entry?.name ?? key.split('/').pop()
            return (
              <li key={key} className="group relative">
                {entry?.isImage || (!entry && accept.startsWith('image')) ? (
                  <SmartImage src={entry?.previewUrl} alt={name} className="aspect-square rounded-xl" />
                ) : (
                  <div className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                    <FileText aria-hidden="true" className="size-6" />
                  </div>
                )}
                <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={name}>
                  {name}
                </p>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(key)}
                    aria-label={`Remove ${name}`}
                    className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={accept}
        multiple={remaining > 1}
        onChange={onFiles}
        disabled={disabled || remaining === 0}
        className="sr-only"
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
      />
      <label
        htmlFor={inputId}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition-colors',
          'has-[:focus-visible]:outline-2',
          invalid
            ? 'border-danger-300 bg-danger-50/50 dark:border-danger-500/50 dark:bg-danger-500/5'
            : 'border-slate-300 hover:border-primary-400 hover:bg-primary-50/40 dark:border-slate-700 dark:hover:border-primary-500 dark:hover:bg-primary-500/5',
          (disabled || remaining === 0) && 'pointer-events-none opacity-50',
          focusRing,
        )}
      >
        <Paperclip aria-hidden="true" className="size-5 text-slate-400" />
        <span className="font-medium text-primary-700 dark:text-primary-300">{label}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {value.length}/{maxFiles} added{minFiles > 0 ? ` (at least ${minFiles})` : ''}
        </span>
      </label>
      <SimulatedUploadNotice />
    </div>
  )
}
