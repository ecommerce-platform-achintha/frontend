import { useId, useMemo, useState } from 'react'
import { FolderTree, Pencil, Plus, Trash2 } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { CATEGORY_SLUG_MAX } from '@/config/admin'
import { errorMessage } from '@/config/errorMessages'
import { useAsync } from '@/hooks/useAsync'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors, LIMITS, REGEX } from '@/utils/validators'
import AsyncContent from '@/components/common/AsyncContent'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import FormField from '@/components/ui/FormField'
import IconButton from '@/components/ui/IconButton'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import Select from '@/components/ui/Select'
import Switch from '@/components/ui/Switch'
import Textarea from '@/components/ui/Textarea'

const DESCRIPTION_MAX = 500

// "Men's Shoes & Bags" -> "mens-shoes-bags" (contract slug regex, max 80).
function slugify(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, CATEGORY_SLUG_MAX)
    .replace(/-+$/, '')
}

function CategoryForm({ category, categories, onClose, onSaved }) {
  const formId = useId()
  const isEdit = Boolean(category)
  const hasChildren = isEdit && categories.some((c) => c.parentSlug === category.slug)
  const [form, setForm] = useState({
    name: category?.name ?? '',
    slug: category?.slug ?? '',
    description: category?.description ?? '',
    parentSlug: category?.parentSlug ?? '',
    active: category ? category.active !== false : true,
  })
  // Suggest the slug from the name until the admin edits the slug themselves (new categories only).
  const [slugTouched, setSlugTouched] = useState(isEdit)
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  // Parents are top-level only: a category with children cannot get a parent.
  const parentOptions = categories.filter((c) => !c.parentSlug && c.slug !== category?.slug).map((c) => ({ value: c.slug, label: c.name }))

  const submit = async (event) => {
    event.preventDefault()
    const next = compactErrors({
      name: !form.name.trim() ? 'Name is required.' : form.name.length > LIMITS.name ? `Up to ${LIMITS.name} characters.` : '',
      slug: !form.slug ? 'Slug is required.' : !REGEX.categorySlug.test(form.slug) || form.slug.length > CATEGORY_SLUG_MAX ? 'Lowercase letters and digits, joined by single dashes (up to 80).' : '',
    })
    setErrors(next)
    setFormMessage('')
    if (Object.keys(next).length) return
    const body = { slug: form.slug, name: form.name.trim(), active: form.active }
    if (form.description.trim()) body.description = form.description.trim()
    if (form.parentSlug) body.parentSlug = form.parentSlug
    setBusy(true)
    try {
      if (isEdit) await adminApi.updateCategory(category.slug, body)
      else await adminApi.createCategory(body)
      onSaved(isEdit ? 'Category saved.' : 'Category created.')
    } catch (err) {
      const { fieldErrors } = splitApiError(err)
      if (err?.code === 'CATEGORY_SLUG_TAKEN') fieldErrors.slug = errorMessage(err)
      if (err?.code === 'CATEGORY_NAME_TAKEN') fieldErrors.name = errorMessage(err)
      setErrors(fieldErrors)
      if (!Object.keys(fieldErrors).length) setFormMessage(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      dismissible={!busy}
      title={isEdit ? 'Edit category' : 'New category'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={busy}>
            Save category
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-4">
        {formMessage && <FormAlert>{formMessage}</FormAlert>}
        <FormField label="Name" required error={errors.name}>
          <Input
            value={form.name}
            maxLength={LIMITS.name}
            onChange={(e) => set({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
          />
        </FormField>
        <FormField
          label="Slug"
          required
          error={errors.slug}
          hint={isEdit ? 'The slug is the category’s id: changing it changes its links, and old links stop working.' : 'Used in links. Suggested from the name.'}
        >
          <Input
            value={form.slug}
            maxLength={CATEGORY_SLUG_MAX}
            spellCheck={false}
            onChange={(e) => {
              setSlugTouched(true)
              set({ slug: e.target.value.toLowerCase() })
            }}
          />
        </FormField>
        {isEdit && form.slug !== category.slug && <FormAlert tone="info">You are changing the slug from “{category.slug}”. Existing links to this category will stop working.</FormAlert>}
        <FormField label="Parent" hint={hasChildren ? 'This category has sub-categories, so it must stay top-level.' : 'Only top-level categories can be parents.'}>
          <Select value={form.parentSlug} onChange={(e) => set({ parentSlug: e.target.value })} options={parentOptions} placeholder="None (top level)" disabled={hasChildren} />
        </FormField>
        <FormField label="Description" error={errors.description}>
          <Textarea value={form.description} onChange={(e) => set({ description: e.target.value })} maxLength={DESCRIPTION_MAX} rows={2} />
        </FormField>
        <Switch checked={form.active} onChange={(v) => set({ active: v })} label="Active" description="Inactive categories are hidden from shoppers." />
      </form>
    </Modal>
  )
}

function DeleteDialog({ category, onClose, onDone }) {
  const [inUse, setInUse] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const run = async (call, message) => {
    setBusy(true)
    setError('')
    try {
      await call()
      onDone(message)
    } catch (err) {
      if (err?.code === 'CATEGORY_IN_USE') setInUse(true)
      else setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }
  const deactivate = () =>
    adminApi.updateCategory(category.slug, {
      slug: category.slug,
      name: category.name,
      description: category.description || undefined,
      parentSlug: category.parentSlug || undefined,
      active: false,
    })

  return (
    <Modal
      open
      size="sm"
      onClose={onClose}
      dismissible={!busy}
      title={inUse ? 'This category is in use' : `Delete “${category.name}”?`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          {inUse ? (
            <Button loading={busy} onClick={() => run(deactivate, 'Category deactivated.')}>
              Deactivate instead
            </Button>
          ) : (
            <Button variant="danger" loading={busy} onClick={() => run(() => adminApi.deleteCategory(category.slug), 'Category deleted.')}>
              Delete
            </Button>
          )}
        </>
      }
    >
      {error && <FormAlert className="mb-3">{error}</FormAlert>}
      <p className="text-sm text-slate-600 dark:text-slate-300">
        {inUse
          ? 'Products use this category, so it cannot be deleted. Deactivating hides it from shoppers and keeps the products linked.'
          : 'Only unused categories can be deleted. This cannot be undone.'}
      </p>
    </Modal>
  )
}

export default function AdminCategoriesPage() {
  const toast = useToast()
  const { data, status, error, reload } = useAsync(() => adminApi.listAdminCategories(), 'admin-categories')
  const [editing, setEditing] = useState(null) // null | 'new' | category
  const [deleting, setDeleting] = useState(null)
  const categories = useMemo(() => (Array.isArray(data) ? data : []), [data])
  // Flat array; parents are top-level only, so the tree has two levels.
  const tree = useMemo(
    () =>
      categories
        .filter((c) => !c.parentSlug)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ ...p, children: categories.filter((c) => c.parentSlug === p.slug).sort((a, b) => a.name.localeCompare(b.name)) })),
    [categories],
  )

  const saved = (message) => {
    setEditing(null)
    setDeleting(null)
    toast.success(message)
    reload()
  }

  // A plain render helper (not a component defined during render, which would remount every time).
  const renderRow = (c, child = false) => (
    <li key={c.slug} className={cn('flex items-center justify-between gap-3 py-2.5', child && 'pl-8', c.active === false && 'opacity-50')}>
      <span className="min-w-0">
        <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
        <span className="ml-2 font-mono text-xs text-slate-500">{c.slug}</span>
        {c.active === false && (
          <Badge className="ml-2" tone="neutral">
            Inactive
          </Badge>
        )}
      </span>
      <span className="flex shrink-0 gap-1">
        <IconButton icon={Pencil} label={`Edit ${c.name}`} size="sm" onClick={() => setEditing(c)} />
        <IconButton icon={Trash2} label={`Delete ${c.name}`} size="sm" variant="danger" onClick={() => setDeleting(c)} />
      </span>
    </li>
  )

  return (
    <>
      <PageHeader
        title="Categories"
        description="The category tree shoppers browse. Two levels: top-level categories and their sub-categories."
        actions={
          <Button leftIcon={Plus} onClick={() => setEditing('new')}>
            New category
          </Button>
        }
      />
      <Card className="p-4 sm:p-5">
        <AsyncContent status={status} error={error} onRetry={reload} isEmpty={tree.length === 0} empty={<EmptyState icon={FolderTree} title="No categories yet" />}>
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {tree.map((p) => (
              <li key={p.slug}>
                <ul className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {renderRow(p)}
                  {p.children.map((c) => renderRow(c, true))}
                </ul>
              </li>
            ))}
          </ul>
        </AsyncContent>
      </Card>
      {editing !== null && <CategoryForm category={editing === 'new' ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={saved} />}
      {deleting && <DeleteDialog key={deleting.slug} category={deleting} onClose={() => setDeleting(null)} onDone={saved} />}
    </>
  )
}
