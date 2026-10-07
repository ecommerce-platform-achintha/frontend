import { cn } from '@/utils/cn'
import { fieldBase, fieldError, fieldHeight, fieldOk } from './styles'

// Text input. `invalid` turns the border red and sets aria-invalid (FormField sets it for you).
export default function Input({ invalid = false, leftIcon: LeftIcon, className, ref, ...props }) {
  return (
    <div className="relative">
      {LeftIcon && (
        <LeftIcon aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(fieldBase, fieldHeight, invalid ? fieldError : fieldOk, LeftIcon && 'pl-10', className)}
        {...props}
      />
    </div>
  )
}
