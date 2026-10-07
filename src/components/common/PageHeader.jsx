import Breadcrumbs from '@/components/ui/Breadcrumbs'

// Page title row: breadcrumbs, title, description and actions on the right.
export default function PageHeader({ title, description, breadcrumbs, actions }) {
  return (
    <div className="mb-6">
      <Breadcrumbs items={breadcrumbs} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
