import { useState } from 'react'
import SmartImage from '@/components/common/SmartImage'
import { cn } from '@/utils/cn'

// Main image + thumbnails. Image URLs never load (simulated uploads), so SmartImage shows a tile.
export default function Gallery({ images, name }) {
  const [active, setActive] = useState(0)
  // Reset to the first image when the image list changes (another variant was picked).
  const signature = images.join('|')
  const [lastSignature, setLastSignature] = useState(signature)
  if (lastSignature !== signature) {
    setLastSignature(signature)
    setActive(0)
  }

  const current = images[active] ?? images[0]
  return (
    <div className="space-y-3">
      <SmartImage src={current} alt={name} name={name} className="aspect-square w-full rounded-[var(--radius-card)]" />
      {images.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((url, index) => (
            <li key={`${url}-${index}`} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show image ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  'block overflow-hidden rounded-xl ring-2 transition',
                  index === active ? 'ring-primary-500' : 'ring-transparent hover:ring-slate-300 dark:hover:ring-slate-600',
                )}
              >
                <SmartImage src={url} alt="" name={name} className="size-16" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
