import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import Input from './Input'

/**
 * Search box that calls `onSearch(text)` after the user stops typing (debounced),
 * or immediately on Enter. `value` is the initial/external value (e.g. from the URL).
 */
export default function SearchInput({ value = '', onSearch, placeholder = 'Search', delay = 350, maxLength = 100, className, ...props }) {
  const [text, setText] = useState(value)
  const debounced = useDebounce(text, delay)
  // Remember the last value we reported so we do not call onSearch twice for the same text.
  const lastSent = useRef(value)

  // Follow external changes (e.g. browser back button changed the URL).
  useEffect(() => {
    setText(value)
    lastSent.current = value
  }, [value])

  useEffect(() => {
    if (debounced !== lastSent.current) {
      lastSent.current = debounced
      onSearch?.(debounced.trim())
    }
  }, [debounced, onSearch])

  const submitNow = () => {
    lastSent.current = text
    onSearch?.(text.trim())
  }

  return (
    <div className={className} role="search">
      <div className="relative">
        <Input
          type="search"
          leftIcon={Search}
          value={text}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submitNow()
            }
          }}
          className="pr-10 [&::-webkit-search-cancel-button]:hidden"
          {...props}
        />
        {text && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setText('')
              lastSent.current = ''
              onSearch?.('')
            }}
            className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
    </div>
  )
}
