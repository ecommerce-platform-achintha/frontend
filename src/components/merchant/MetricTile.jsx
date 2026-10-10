import { formatMetric } from './formatMetric'

export default function MetricTile({ field, value, showHelp = false }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{field.label}</dt>
      <dd className="mt-1 text-xl font-semibold text-slate-900 tabular-nums dark:text-white">{formatMetric(field.kind, value)}</dd>
      {showHelp && <dd className="mt-1 text-xs text-slate-500 dark:text-slate-400">{field.help}</dd>}
    </div>
  )
}
