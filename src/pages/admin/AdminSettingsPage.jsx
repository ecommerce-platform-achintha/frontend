import { useMemo, useState } from 'react'
import { History, Info, RotateCcw } from 'lucide-react'
import * as adminApi from '@/api/admin'
import { READ_ONLY_SETTINGS, SETTING_GROUPS } from '@/config/admin'
import { ADMIN_PAGE_SIZE_OPTIONS } from '@/config/constants'
import { errorMessage } from '@/config/errorMessages'
import { useAsync } from '@/hooks/useAsync'
import { usePagedRequest } from '@/hooks/usePagedRequest'
import { useToast } from '@/hooks/useToast'
import { formatDateTime } from '@/utils/format'
import { LIMITS } from '@/utils/validators'
import { settingsCache } from '@/components/admin/settingsCache'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Drawer from '@/components/ui/Drawer'
import ErrorState from '@/components/ui/ErrorState'
import Input from '@/components/ui/Input'
import Pagination from '@/components/ui/Pagination'
import Skeleton from '@/components/ui/Skeleton'
import Switch from '@/components/ui/Switch'

const prefixOf = (key) => key.split('.')[0]
// "timers.ship-by-hours" -> "Ship by hours"
const labelOf = (key) => {
  const last = key.slice(key.indexOf('.') + 1).replace(/[-.]/g, ' ')
  return last.charAt(0).toUpperCase() + last.slice(1)
}

// Client-side check by `type`, `min` and `max` from the API; the server still validates (INVALID_SETTING_VALUE).
function validateValue(setting, raw) {
  const v = String(raw).trim()
  if (setting.type === 'BOOLEAN') return v === 'true' || v === 'false' ? '' : 'Choose on or off.'
  const re = setting.type === 'INTEGER' ? /^-?\d+$/ : /^-?\d+(\.\d{1,2})?$/
  if (!re.test(v)) return setting.type === 'INTEGER' ? 'Enter a whole number.' : 'Enter a number with up to 2 decimals.'
  const n = Number(v)
  if (setting.min != null && n < Number(setting.min)) return `At least ${setting.min}.`
  if (setting.max != null && n > Number(setting.max)) return `At most ${setting.max}.`
  return ''
}

function SettingRow({ setting, onSaved, onHistory }) {
  const toast = useToast()
  const [value, setValue] = useState(String(setting.value))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const readOnly = READ_ONLY_SETTINGS.includes(setting.key)
  const changed = value !== String(setting.value)

  const save = async (next = value) => {
    const problem = validateValue(setting, next)
    setError(problem)
    if (problem) return
    setBusy(true)
    try {
      await adminApi.updateSetting(setting.key, { value: String(next).trim(), reason: reason.trim() || undefined })
      setReason('')
      toast.success(`${setting.key} saved. Other services pick up the change shortly (roughly within a minute).`)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const isDefault = String(setting.value) === String(setting.defaultValue)
  return (
    <li className="grid gap-3 py-4 lg:grid-cols-[1fr_auto]">
      <div className="min-w-0 space-y-1">
        <p className="font-medium text-slate-900 dark:text-white">{labelOf(setting.key)}</p>
        <p className="font-mono text-xs text-slate-500">{setting.key}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {setting.type.toLowerCase()} · default {String(setting.defaultValue)}
          {setting.min != null && ` · min ${setting.min}`}
          {setting.max != null && ` · max ${setting.max}`}
          {setting.updatedAt && ` · changed ${formatDateTime(setting.updatedAt)}${setting.updatedBy ? ` by ${setting.updatedBy}` : ''}`}
        </p>
        {readOnly && <p className="text-xs text-sky-700 dark:text-sky-300">Read only: only “false” is accepted. Fees are recorded but never charged.</p>}
      </div>
      <div className="flex flex-col gap-2 lg:w-[28rem]">
        <div className="flex flex-wrap items-center gap-2">
          {setting.type === 'BOOLEAN' ? (
            <Switch
              checked={value === 'true'}
              disabled={readOnly || busy}
              label={value === 'true' ? 'On' : 'Off'}
              onChange={(v) => {
                setValue(String(v))
                setError('')
              }}
            />
          ) : (
            <Input
              aria-label={`Value for ${setting.key}`}
              inputMode={setting.type === 'INTEGER' ? 'numeric' : 'decimal'}
              value={value}
              disabled={readOnly || busy}
              invalid={Boolean(error)}
              onChange={(e) => {
                setValue(e.target.value)
                setError('')
              }}
              className="w-32"
            />
          )}
          {!readOnly && (
            <>
              <Button size="sm" onClick={() => save()} disabled={!changed} loading={busy}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={RotateCcw}
                disabled={isDefault || busy}
                onClick={() => {
                  setValue(String(setting.defaultValue))
                  save(String(setting.defaultValue))
                }}
              >
                Reset to default
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" leftIcon={History} onClick={() => onHistory(setting.key)}>
            History
          </Button>
        </div>
        {!readOnly && changed && (
          <Input aria-label={`Reason for changing ${setting.key} (optional)`} placeholder="Reason (optional)" value={reason} maxLength={LIMITS.reason} onChange={(e) => setReason(e.target.value)} />
        )}
        {error && (
          <p role="alert" className="text-xs font-medium text-danger-600 dark:text-danger-400">
            {error}
          </p>
        )}
      </div>
    </li>
  )
}

/*
 * The contract says the history is paged but does not name its fields. We read
 * value / oldValue / newValue, reason, updatedBy / changedBy and updatedAt / changedAt / createdAt.
 */
function HistoryDrawer({ settingKey, onClose }) {
  const [paging, setPaging] = useState({ page: 0, size: 20 })
  const history = usePagedRequest((p) => adminApi.listSettingHistory(settingKey, p), paging, settingKey)
  return (
    <Drawer open side="right" wide title={`History · ${settingKey}`} onClose={onClose}>
      <div className="p-4">
        <AsyncContent status={history.status} error={history.error} onRetry={history.reload} isEmpty={history.items.length === 0} empty={<p className="text-sm text-slate-500">No changes yet.</p>}>
          <ol className="space-y-3 text-sm">
            {history.items.map((h, i) => (
              <li key={i} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="font-mono">
                  {h.oldValue != null && `${h.oldValue} → `}
                  {h.newValue ?? h.value}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDateTime(h.updatedAt ?? h.changedAt ?? h.createdAt)}
                  {(h.updatedBy ?? h.changedBy) && ` · ${h.updatedBy ?? h.changedBy}`}
                </p>
                {h.reason && <p className="mt-1 text-slate-700 dark:text-slate-300">“{h.reason}”</p>}
              </li>
            ))}
          </ol>
          <Pagination
            {...history.pageInfo}
            sizeOptions={ADMIN_PAGE_SIZE_OPTIONS}
            onPageChange={(page) => setPaging((p) => ({ ...p, page }))}
            onSizeChange={(size) => setPaging({ page: 0, size })}
          />
        </AsyncContent>
      </div>
    </Drawer>
  )
}

// Rendered entirely from GET /api/super-admin/settings; no key list is hard-coded.
export default function AdminSettingsPage() {
  const { data, status, error, reload } = useAsync(() => adminApi.listSettings(), 'settings')
  const [historyKey, setHistoryKey] = useState(null)

  const groups = useMemo(() => {
    const settings = Array.isArray(data) ? [...data].sort((a, b) => a.key.localeCompare(b.key)) : []
    const known = SETTING_GROUPS.map((g) => ({ ...g, items: settings.filter((s) => prefixOf(s.key) === g.prefix) }))
    const other = settings.filter((s) => !SETTING_GROUPS.some((g) => g.prefix === prefixOf(s.key)))
    return [...known, { prefix: 'other', label: 'Other', items: other }].filter((g) => g.items.length)
  }, [data])

  const saved = () => {
    settingsCache.clear() // badges that show timers.ban-grace-days read it again
    reload()
  }

  return (
    <>
      <PageHeader title="Settings" description="Timers, score rules, limits and fees used by every service." />
      <p className="mb-4 flex items-start gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 dark:bg-sky-500/10 dark:text-sky-300">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Services cache settings, so a change takes effect after a short delay (about a minute; approximate).
      </p>
      {status === 'failed' ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <Card key={g.prefix}>
              <Card.Header title={g.label} actions={<Badge>{g.items.length}</Badge>} />
              <Card.Body className="pt-1">
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {g.items.map((s) => (
                    <SettingRow key={`${s.key}:${s.value}:${s.updatedAt}`} setting={s} onSaved={saved} onHistory={setHistoryKey} />
                  ))}
                </ul>
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
      {historyKey && <HistoryDrawer key={historyKey} settingKey={historyKey} onClose={() => setHistoryKey(null)} />}
    </>
  )
}
