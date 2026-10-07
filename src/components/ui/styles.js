// Shared Tailwind class strings so every control looks the same.

export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500'

// Text inputs, selects and textareas.
export const fieldBase =
  'block w-full rounded-[var(--radius-control)] border bg-white px-3.5 text-sm text-slate-900 shadow-soft transition ' +
  'placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 ' +
  'focus:outline-none focus:ring-4 ' +
  'dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800/60'

export const fieldOk =
  'border-slate-300 focus:border-primary-500 focus:ring-primary-500/15 dark:border-slate-700 dark:focus:border-primary-400'

export const fieldError =
  'border-danger-400 focus:border-danger-500 focus:ring-danger-500/15 dark:border-danger-500/70'

export const fieldHeight = 'h-11' // 44px: comfortable tap target

// Badge / banner tones. Keys match STATUS_TONES in config/enums.js.
export const toneClasses = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-500/15 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20',
  primary: 'bg-primary-50 text-primary-700 ring-primary-600/15 dark:bg-primary-500/15 dark:text-primary-300 dark:ring-primary-400/25',
  info: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-400/25',
  success: 'bg-success-50 text-success-700 ring-success-600/15 dark:bg-success-500/15 dark:text-success-300 dark:ring-success-400/25',
  warning: 'bg-warning-50 text-warning-800 ring-warning-600/20 dark:bg-warning-500/15 dark:text-warning-300 dark:ring-warning-400/25',
  danger: 'bg-danger-50 text-danger-700 ring-danger-600/15 dark:bg-danger-500/15 dark:text-danger-300 dark:ring-danger-400/25',
}
