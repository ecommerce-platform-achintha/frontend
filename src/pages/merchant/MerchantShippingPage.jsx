import { useMemo, useState } from 'react'
import { Info, Pencil, Plus, Trash2, Truck } from 'lucide-react'
import * as storesApi from '@/api/stores'
import { merchantLists } from '@/store/slices/merchantLists'
import { errorMessage } from '@/config/errorMessages'
import { MAX_ENABLED_COURIERS, SHIPPING_RULE_LABELS } from '@/config/merchant'
import { useAsync } from '@/hooks/useAsync'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { usePagedList } from '@/hooks/usePagedList'
import { useToast } from '@/hooks/useToast'
import { formatMoney } from '@/utils/format'
import AsyncContent from '@/components/common/AsyncContent'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Checkbox from '@/components/ui/Checkbox'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import IconButton from '@/components/ui/IconButton'
import Skeleton from '@/components/ui/Skeleton'
import ShippingTemplateForm from './ShippingTemplateForm'

/*
 * Shipping templates are ESTIMATES. The contract has no customer-facing shipping estimate endpoint
 * (contract section 10.4), so nothing a customer sees reads these yet: they are informational for
 * the store, and the real delivery charge is always the one set in each quote.
 */

async function loadCouriers() {
  const [available, enabled] = await Promise.all([storesApi.listAvailableCouriers(), storesApi.listMyCouriers()])
  return { available: Array.isArray(available) ? available : [], enabled: Array.isArray(enabled) ? enabled : [] }
}

function CouriersSection({ readOnly, onSaved }) {
  const toast = useToast()
  const { data, status, error, reload, setData } = useAsync(loadCouriers, 'couriers')
  const [selected, setSelected] = useState(null) // null = not edited yet (use the saved list)
  const [confirmRemove, setConfirmRemove] = useState(null)
  const [busy, setBusy] = useState(false)

  if (status === 'loading' || status === 'idle') return <Skeleton className="h-48 w-full" />
  if (status === 'failed') return <ErrorState error={error} onRetry={reload} />

  const savedCodes = data.enabled.map((c) => c.code)
  const current = selected ?? savedCodes
  const changed = current.length !== savedCodes.length || current.some((c) => !savedCodes.includes(c))
  const removed = savedCodes.filter((c) => !current.includes(c))
  const toggle = (code, on) => setSelected(on ? [...current, code] : current.filter((c) => c !== code))

  const save = async () => {
    setBusy(true)
    try {
      const enabled = await storesApi.setMyCouriers(current)
      setData({ ...data, enabled: Array.isArray(enabled) ? enabled : data.available.filter((c) => current.includes(c.code)) })
      setSelected(null)
      setConfirmRemove(null)
      toast.success('Couriers saved.')
      onSaved()
    } catch (err) {
      toast.apiError(err)
      throw err
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <Card.Header title="Couriers" description="The couriers your store ships with. Quotes and shipments can use only these." />
      <Card.Body className="space-y-4">
        {data.available.length === 0 ? (
          <p className="text-sm text-slate-500">No couriers are available on the marketplace yet.</p>
        ) : (
          <fieldset disabled={readOnly || busy} className="grid gap-1 sm:grid-cols-2">
            <legend className="sr-only">Enabled couriers</legend>
            {data.available.map((c) => (
              <Checkbox
                key={c.code}
                checked={current.includes(c.code)}
                onChange={(e) => toggle(c.code, e.target.checked)}
                disabled={c.active === false || (!current.includes(c.code) && current.length >= MAX_ENABLED_COURIERS)}
                label={c.name ?? c.code}
                description={[c.code, c.codSupported ? 'supports cash on delivery' : 'no cash on delivery', c.active === false && 'not available'].filter(Boolean).join(' · ')}
              />
            ))}
          </fieldset>
        )}
        {!readOnly && (
          <div className="flex items-center justify-end gap-2">
            {changed && (
              <Button variant="outline" onClick={() => setSelected(null)} disabled={busy}>
                Undo changes
              </Button>
            )}
            <Button onClick={() => (removed.length ? setConfirmRemove(removed) : save().catch(() => {}))} disabled={!changed} loading={busy}>
              Save couriers
            </Button>
          </div>
        )}
      </Card.Body>
      <ConfirmDialog
        open={confirmRemove !== null}
        title="Stop using these couriers?"
        message={`${(confirmRemove ?? []).join(', ')} will no longer be available for quotes and shipments.`}
        confirmLabel="Save couriers"
        tone="danger"
        onConfirm={save}
        onCancel={() => setConfirmRemove(null)}
      />
    </Card>
  )
}

const rateSummary = (t) => {
  if (t.ruleType === 'FLAT') return formatMoney(t.baseAmount)
  const n = t.rates?.length ?? 0
  return `${n} ${t.ruleType === 'PER_DISTRICT' ? 'district' : 'band'}${n === 1 ? '' : 's'}${t.baseAmount != null ? ` · otherwise ${formatMoney(t.baseAmount)}` : ''}`
}

function TemplatesSection({ readOnly, couriersVersion }) {
  const toast = useToast()
  // One template per enabled courier (at most 20), so one page of 50 holds them all.
  const params = useMemo(() => ({ page: 0, size: 50 }), [])
  const { items, status, error, reload } = usePagedList(merchantLists.shippingTemplates, params)
  const enabled = useAsync(() => storesApi.listMyCouriers(), `enabled-${couriersVersion}`)
  const enabledCouriers = Array.isArray(enabled.data) ? enabled.data : []
  const [editing, setEditing] = useState(null) // null | 'new' | template
  const [deleting, setDeleting] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  const withoutTemplate = enabledCouriers.filter((c) => !items.some((t) => t.courierCode === c.code))
  const courierName = (code) => enabledCouriers.find((c) => c.code === code)?.name ?? code

  const remove = async () => {
    setDeleteError('')
    try {
      await storesApi.deleteShippingTemplate(deleting.publicId)
      setDeleting(null)
      toast.success('Shipping template deleted.')
      reload()
    } catch (err) {
      setDeleteError(errorMessage(err))
      throw err
    }
  }

  return (
    <Card>
      <Card.Header
        title="Shipping templates"
        description="Your delivery price estimates, one per courier."
        actions={
          !readOnly && (
            <Button size="sm" leftIcon={Plus} onClick={() => setEditing('new')} disabled={withoutTemplate.length === 0}>
              New template
            </Button>
          )
        }
      />
      <Card.Body className="space-y-4">
        <p className="flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:bg-sky-500/10 dark:text-sky-300">
          <Info aria-hidden="true" className="mt-px size-4 shrink-0" />
          Estimates only. Customers do not see these yet; the delivery charge you enter in each quote is what they pay.
        </p>
        {!readOnly && enabled.status === 'succeeded' && enabledCouriers.length > 0 && withoutTemplate.length === 0 && items.length > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">Every enabled courier has a template.</p>
        )}
        <AsyncContent
          status={status}
          error={error}
          onRetry={reload}
          isEmpty={items.length === 0}
          empty={
            <EmptyState
              icon={Truck}
              title="No templates yet"
              description={enabledCouriers.length ? 'Add an estimate for each courier you use.' : 'Enable a courier first, then add its estimate.'}
            />
          }
        >
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((t) => (
              <li key={t.publicId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {t.name} <span className="font-normal text-slate-500">· {courierName(t.courierCode)}</span>
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    {SHIPPING_RULE_LABELS[t.ruleType] ?? t.ruleType}: {rateSummary(t)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.active === false && <Badge>Inactive</Badge>}
                  {!readOnly && (
                    <>
                      <IconButton icon={Pencil} label={`Edit ${t.name}`} size="sm" onClick={() => setEditing(t)} />
                      <IconButton icon={Trash2} label={`Delete ${t.name}`} size="sm" variant="danger" onClick={() => setDeleting(t)} />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </AsyncContent>
      </Card.Body>

      {editing !== null && (
        <ShippingTemplateForm
          template={editing === 'new' ? null : editing}
          couriers={editing === 'new' ? withoutTemplate : enabledCouriers}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null)
            toast.success(message)
            reload()
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this template?"
        message={deleting && `The estimate “${deleting.name}” will be removed.`}
        confirmLabel="Delete"
        tone="danger"
        error={deleteError}
        onConfirm={remove}
        onCancel={() => {
          setDeleting(null)
          setDeleteError('')
        }}
      />
    </Card>
  )
}

export default function MerchantShippingPage() {
  const { readOnly } = useMerchantStatus()
  // Bumped after the courier list is saved, so the template form sees the new couriers.
  const [couriersVersion, setCouriersVersion] = useState(0)
  return (
    <>
      <PageHeader title="Couriers and shipping" description="Choose your couriers and keep delivery estimates for each." />
      {readOnly && <FormAlert className="mb-4">Your store is banned, so this page is read only.</FormAlert>}
      <div className="space-y-6">
        <CouriersSection readOnly={readOnly} onSaved={() => setCouriersVersion((v) => v + 1)} />
        <TemplatesSection readOnly={readOnly} couriersVersion={couriersVersion} />
      </div>
    </>
  )
}
