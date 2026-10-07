import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { initials } from '@/utils/format'
import { cn } from '@/utils/cn'

/**
 * <img> with a fallback tile. Backend image URLs point at images.example.invalid and never load
 * (uploads are simulated), so every image in the app goes through this component.
 * `name` gives the fallback initials; without it an icon is shown.
 */
export default function SmartImage({ src, alt = '', name, className, imgClassName, ...props }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const failed = !src || failedSrc === src

  if (failed) {
    return (
      <div
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 font-semibold text-slate-500 select-none dark:from-slate-800 dark:to-slate-900 dark:text-slate-400',
          className,
        )}
      >
        {name ? <span className="text-lg">{initials(name)}</span> : <ImageOff aria-hidden="true" className="size-6" />}
      </div>
    )
  }

  return (
    <div className={cn('overflow-hidden bg-slate-100 dark:bg-slate-800', className)}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={cn('size-full object-cover', imgClassName)}
        {...props}
      />
    </div>
  )
}
