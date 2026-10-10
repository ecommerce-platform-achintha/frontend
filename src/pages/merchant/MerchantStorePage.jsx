import { useState } from 'react'
import { CircleCheck, CircleDashed, Store } from 'lucide-react'
import * as storesApi from '@/api/stores'
import { SRI_LANKA_DISTRICTS } from '@/config/districts'
import { errorMessage } from '@/config/errorMessages'
import { STORE_LIMITS } from '@/config/merchant'
import { useAsync } from '@/hooks/useAsync'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { useToast } from '@/hooks/useToast'
import { splitApiError } from '@/utils/formErrors'
import { compactErrors, normalizePhone, validateEmail, validatePhone } from '@/utils/validators'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import SmartImage from '@/components/common/SmartImage'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'
import FilePicker from '@/components/ui/FilePicker'
import FormField from '@/components/ui/FormField'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Skeleton from '@/components/ui/Skeleton'
import Switch from '@/components/ui/Switch'
import Textarea from '@/components/ui/Textarea'

const DESCRIPTION_MAX = 2000
const TEXT_MAX = 200

// GET /api/merchant/store is a 404 until the first save: that is "set up your store", not an error.
async function loadStore() {
  try {
    return await storesApi.getMyStore()
  } catch (error) {
    if (error?.status === 404) return null
    throw error
  }
}

const FIELDS = ['name', 'description', 'contactPhone', 'contactEmail', 'addressLine', 'city', 'district']
const toForm = (store) => ({
  ...Object.fromEntries(FIELDS.map((f) => [f, store?.[f] ?? ''])),
  logoKeys: store?.logoKey ? [store.logoKey] : [],
})

// Optional fields a complete profile usually has. The server decides `profileComplete`; this only helps find gaps.
const HELPFUL_FIELDS = [
  ['description', 'a description'],
  ['contactPhone', 'a contact phone'],
  ['contactEmail', 'a contact email'],
  ['addressLine', 'an address'],
  ['city', 'a city'],
  ['district', 'a district'],
  ['logoKey', 'a logo'],
]

function validate(form) {
  const name = form.name.trim()
  return compactErrors({
    name: !name ? 'Store name is required.' : name.length < STORE_LIMITS.nameMin || name.length > STORE_LIMITS.nameMax ? `Use ${STORE_LIMITS.nameMin} to ${STORE_LIMITS.nameMax} characters.` : '',
    contactPhone: validatePhone(form.contactPhone, { required: false }),
    contactEmail: form.contactEmail.trim() ? validateEmail(form.contactEmail) : '',
  })
}

function toBody(form) {
  const body = { name: form.name.trim() }
  for (const f of ['description', 'contactEmail', 'addressLine', 'city', 'district']) {
    const v = form[f].trim()
    if (v) body[f] = v
  }
  const phone = normalizePhone(form.contactPhone)
  if (phone) body.contactPhone = phone
  if (form.logoKeys[0]) body.logoKey = form.logoKeys[0]
  return body
}

function VisibilityCard({ store, isPending }) {
  const missing = HELPFUL_FIELDS.filter(([key]) => !store[key]).map(([, label]) => label)
  return (
    <Card>
      <Card.Header title="Visibility" />
      <Card.Body className="space-y-3 text-sm">
        <p className="flex items-center gap-2">
          {store.profileComplete ? (
            <CircleCheck aria-hidden="true" className="size-5 text-success-600" />
          ) : (
            <CircleDashed aria-hidden="true" className="size-5 text-slate-400" />
          )}
          Profile {store.profileComplete ? 'complete' : 'not complete yet'}
        </p>
        {!store.profileComplete && missing.length > 0 && (
          <p className="text-slate-600 dark:text-slate-300">Still empty: {missing.join(', ')}. Fill these in and save.</p>
        )}
        <p className="flex items-center gap-2">
          <Badge tone={store.published ? 'success' : 'neutral'}>{store.published ? 'Visible to shoppers' : 'Not visible to shoppers'}</Badge>
        </p>
        {!store.published && (
          <p className="text-slate-600 dark:text-slate-300">
            {isPending
              ? 'Your store becomes visible after your account is approved and your profile is complete.'
              : !store.profileComplete
                ? 'Complete your profile so shoppers can find your store.'
                : 'Shoppers cannot see your store right now.'}
          </p>
        )}
      </Card.Body>
    </Card>
  )
}

function CodCard({ store, onSaved, readOnly }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const change = async (enabled) => {
    setBusy(true)
    try {
      const saved = await storesApi.setCodEnabled(enabled)
      toast.success(enabled ? 'Cash on delivery is on.' : 'Cash on delivery is off.')
      onSaved(saved?.publicId || saved?.name ? saved : { ...store, codEnabled: enabled })
    } catch (err) {
      toast.apiError(err)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Card>
      <Card.Header title="Cash on delivery" />
      <Card.Body className="space-y-3">
        <Switch
          checked={Boolean(store.codEnabled)}
          onChange={change}
          disabled={busy || readOnly}
          label="Accept cash on delivery"
          description="Customers can choose to pay the courier. Each product can also allow or block it."
        />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Only couriers that support cash on delivery can carry COD orders.
        </p>
      </Card.Body>
    </Card>
  )
}

function ProfileForm({ store, onSaved, readOnly }) {
  const toast = useToast()
  const [form, setForm] = useState(() => toForm(store))
  const [errors, setErrors] = useState({})
  const [formMessage, setFormMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const bind = (name) => ({ value: form[name], onChange: (e) => set({ [name]: e.target.value }) })

  const submit = async (event) => {
    event.preventDefault()
    const problems = validate(form)
    setErrors(problems)
    setFormMessage('')
    if (Object.keys(problems).length) return
    setBusy(true)
    try {
      const saved = await storesApi.updateMyStore(toBody(form))
      toast.success(store ? 'Store profile saved.' : 'Your store is set up.')
      onSaved(saved)
    } catch (err) {
      const { fieldErrors, formMessage: message } = splitApiError(err)
      if (err?.code === 'STORE_NAME_TAKEN') fieldErrors.name = errorMessage(err)
      setErrors(fieldErrors)
      if (!Object.keys(fieldErrors).length) setFormMessage(errorMessage(err, message))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <Card.Header title="Store profile" description="Shown on your store page." />
      <Card.Body>
        <form onSubmit={submit} noValidate>
          <fieldset disabled={readOnly} className="space-y-4">
            {formMessage && <FormAlert>{formMessage}</FormAlert>}
            <FormField label="Store name" required error={errors.name} hint={`${STORE_LIMITS.nameMin} to ${STORE_LIMITS.nameMax} characters. Must be unique.`}>
              <Input {...bind('name')} maxLength={STORE_LIMITS.nameMax} />
            </FormField>
            <FormField label="Description" error={errors.description}>
              <Textarea {...bind('description')} maxLength={DESCRIPTION_MAX} rows={4} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Contact phone" error={errors.contactPhone} hint="International format, for example +94771234567.">
                <Input {...bind('contactPhone')} type="tel" autoComplete="tel" />
              </FormField>
              <FormField label="Contact email" error={errors.contactEmail}>
                <Input {...bind('contactEmail')} type="email" autoComplete="email" maxLength={254} />
              </FormField>
            </div>
            <FormField label="Address" error={errors.addressLine}>
              <Input {...bind('addressLine')} maxLength={TEXT_MAX} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="City" error={errors.city}>
                <Input {...bind('city')} maxLength={100} />
              </FormField>
              <FormField label="District" error={errors.district}>
                <Select {...bind('district')} options={SRI_LANKA_DISTRICTS.map((d) => ({ value: d, label: d }))} placeholder="Choose a district" />
              </FormField>
            </div>
            <div className="flex items-start gap-4">
              {store?.logoUrl && form.logoKeys[0] === store.logoKey && (
                <SmartImage src={store.logoUrl} alt="Current logo" name={store.name} className="mt-7 size-16 shrink-0 rounded-xl" />
              )}
              <FormField label="Logo" error={errors.logoKey} className="flex-1">
                <FilePicker value={form.logoKeys} onChange={(keys) => set({ logoKeys: keys })} maxFiles={1} folder="logos" label="Choose a logo" />
              </FormField>
            </div>
            {!readOnly && (
              <div className="flex justify-end">
                <Button type="submit" loading={busy}>
                  {store ? 'Save profile' : 'Create my store'}
                </Button>
              </div>
            )}
          </fieldset>
        </form>
      </Card.Body>
    </Card>
  )
}

export default function MerchantStorePage() {
  const { readOnly, isPending } = useMerchantStatus()
  const { data: store, status, error, reload, setData } = useAsync(loadStore, 'my-store')

  if (status === 'loading' || status === 'idle') return <Skeleton className="h-96 w-full" />
  if (status === 'failed') return <ErrorState error={error} onRetry={reload} />

  // After a save, take the response if it is the store; otherwise read it again.
  const onSaved = (saved) => (saved && typeof saved === 'object' && 'name' in saved ? setData(saved) : reload())

  return (
    <>
      <PageHeader
        title={store ? 'Store profile' : 'Set up your store'}
        description={store ? 'How shoppers see your store.' : 'Start with a name. You can fill in the rest later.'}
      />
      {!store ? (
        <div className="space-y-4">
          <FormAlert tone="info" title="Welcome">
            <span className="flex items-center gap-2">
              <Store aria-hidden="true" className="size-4" /> Your store does not have a profile yet. Save this form to create it.
            </span>
          </FormAlert>
          <ProfileForm store={null} onSaved={onSaved} readOnly={readOnly} />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <ProfileForm key={store.updatedAt ?? store.name} store={store} onSaved={onSaved} readOnly={readOnly} />
          <div className="space-y-6">
            <VisibilityCard store={store} isPending={isPending} />
            <CodCard store={store} onSaved={onSaved} readOnly={readOnly} />
          </div>
        </div>
      )}
    </>
  )
}
