import { Info } from 'lucide-react'
import { cn } from '@/utils/cn'

// Shown next to every file picker: there is no upload API, only storage keys are sent.
export default function SimulatedUploadNotice({ className }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-500/10 dark:text-sky-300',
        className,
      )}
    >
      <Info aria-hidden="true" className="mt-px size-4 shrink-0" />
      <span>
        Uploads are simulated. Your files stay on this device; we only save a reference name for each one, so the images will not
        appear for other people.
      </span>
    </p>
  )
}
