import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Banknote, CircleCheck, CircleX, Landmark, MapPin, Plus } from 'lucide-react'
import * as ordersApi from '@/api/orders'
import * as usersApi from '@/api/users'
import { fetchCart, selectCart, selectSelectedGroups, selectSelectedIds, selectSelectedTotal } from '@/store/slices/cartSlice'
import { fetchPublicStore, selectPublicStoresById, selectPublicStoreStatuses } from '@/store/slices/publicStoresSlice'
import { errorMessage } from '@/config/errorMessages'
import { useAsync } from '@/hooks/useAsync'
import { useIdempotencyKey } from '@/hooks/useIdempotencyKey'
import { useToast } from '@/hooks/useToast'
import { formatMoney } from '@/utils/format'
import { cn } from '@/utils/cn'
import AddressForm from '@/components/address/AddressForm'
import AddressText from '@/components/address/AddressText'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import ShopperButton from '@/components/common/ShopperButton'
import SmartImage from '@/components/common/SmartImage'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'
import Skeleton from '@/components/ui/Skeleton'

// Codes that reject the whole request (contract 7.4); shown as one alert.
const WHOLE_REQUEST_CODES = ['CUSTOMER_BANNED', 'ADDRESS_NOT_FOUND', 'CART_ITEM_NOT_FOUND', 'PAYMENT_METHOD_MISSING']

/**
 * COD needs the store to offer it AND every selected line of that store to allow it.
 * The cart has no codEnabled flag, so the public store profile is used (contract 10.5).
 */
function codState(group, store, storeStatus) {
  if (storeStatus !== 'succeeded') {
    return { allowed: false, reason: storeStatus === 'failed' ? 'We could not check cash on delivery for this store.' : 'Checking…' }
  }
  if (!store?.codEnabled) return { allowed: false, reason: 'This store does not offer cash on delivery.' }
  if (!group.lines.every((l) => l.codAllowed)) return { allowed: false, reason: 'Some of these items can only be paid by bank transfer.' }
  return { allowed: true, reason: '' }
}

function MethodOption({ checked, disabled, onChange, icon: Icon, title, text, name }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition',
        checked ? 'border-primary-500 bg-primary-50/60 ring-1 ring-primary-500 dark:bg-primary-500/10' : 'border-slate-200 dark:border-slate-700',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} className="mt-1 accent-primary-600" />
      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-slate-500" />
      <span className="text-sm">
        <span className="block font-medium text-slate-900 dark:text-white">{title}</span>
        <span className="text-slate-500 dark:text-slate-400">{text}</span>
      </span>
    </label>
  )
}

// `addresses` is loaded by the page so the default choice is known while rendering.
function AddressSection({ addresses, status, error, reload, selectedId, onSelect }) {
  const toast = useToast()
  const [adding, setAdding] = useState(false)

  const create = async (body) => {
    const created = await usersApi.createAddress(body)
    toast.success('Address added.')
    setAdding(false)
    reload()
    if (created?.publicId) onSelect(created.publicId)
  }

  return (
    <Card>
      <Card.Header
        title="1. Delivery address"
        actions={
          !adding && (
            <Button variant="ghost" size="sm" leftIcon={Plus} onClick={() => setAdding(true)}>
              Add address
            </Button>
          )
        }
      />
      <Card.Body className="space-y-3">
        {status === 'loading' && <Skeleton className="h-24 w-full" />}
        {status === 'failed' && <ErrorState error={error} onRetry={reload} title="Addresses could not be loaded" />}
        {status === 'succeeded' && addresses.length === 0 && !adding && (
          <div className="flex flex-col items-center gap-3 py-6 text-center text-sm text-slate-500">
            <MapPin aria-hidden="true" className="size-6" />
            You have no saved addresses yet.
            <Button leftIcon={Plus} onClick={() => setAdding(true)}>
              Add an address
            </Button>
          </div>
        )}
        {addresses.length > 0 && (
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Choose a delivery address</legend>
            {addresses.map((address) => (
              <label
                key={address.publicId}
                className={cn(
                  'flex cursor-pointer gap-3 rounded-xl border p-4 transition',
                  selectedId === address.publicId
                    ? 'border-primary-500 bg-primary-50/60 ring-1 ring-primary-500 dark:bg-primary-500/10'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-700',
                )}
              >
                <input
                  type="radio"
                  name="address"
                  checked={selectedId === address.publicId}
                  onChange={() => onSelect(address.publicId)}
                  className="mt-1 accent-primary-600"
                />
                <AddressText address={address} />
              </label>
            ))}
          </fieldset>
        )}
        {adding && (
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <AddressForm onSubmit={create} onCancel={() => setAdding(false)} submitLabel="Save and use this address" />
          </div>
        )}
      </Card.Body>
    </Card>
  )
}

function ResultCards({ results }) {
  return (
    <ul className="space-y-3">
      {results.map((r) => (
        <li key={r.storePublicId}>
          <Card className="flex items-start gap-3 p-4">
            {r.status === 'PLACED' ? (
              <CircleCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-success-600" />
            ) : (
              <CircleX aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-danger-600" />
            )}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-slate-900 dark:text-white">{r.storeName}</p>
              {r.status === 'PLACED' ? (
                <p className="text-slate-600 dark:text-slate-300">
                  Order{' '}
                  <Link to={`/orders/${r.orderPublicId}`} className="font-medium text-primary-700 hover:underline dark:text-primary-300">
                    {r.orderPublicId}
                  </Link>{' '}
                  placed{r.grandTotal != null && <> · {formatMoney(r.grandTotal)}</>}
                </p>
              ) : (
                <p className="text-danger-700 dark:text-danger-300">{errorMessage(r, 'This store could not take the order.')}</p>
              )}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  )
}

export default function CheckoutPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const idem = useIdempotencyKey()
  const cart = useSelector(selectCart)
  const groups = useSelector(selectSelectedGroups)
  const selectedIds = useSelector(selectSelectedIds)
  const itemsTotal = useSelector(selectSelectedTotal)
  const storesById = useSelector(selectPublicStoresById)
  const storeStatuses = useSelector(selectPublicStoreStatuses)

  // Up to 50 addresses, most recently updated first; the first one is the default choice.
  const addressQuery = useAsync(() => usersApi.listAddresses({ page: 0, size: 50, sort: 'updatedAt,desc' }), 'addresses')
  const addresses = useMemo(() => addressQuery.data?.content ?? [], [addressQuery.data])
  const [chosenAddressId, setAddressId] = useState(null)
  const addressId = addresses.some((a) => a.publicId === chosenAddressId) ? chosenAddressId : (addresses[0]?.publicId ?? null)
  const [methods, setMethods] = useState({}) // storePublicId -> 'COD' | 'BANK_TRANSFER'
  const [placing, setPlacing] = useState(false)
  const [formError, setFormError] = useState('')
  const [results, setResults] = useState(null) // per-store results when some store failed

  // Load each store's profile once (cached) for the COD check.
  const storeIds = groups.map((g) => g.storePublicId).join(',')
  useEffect(() => {
    storeIds.split(',').filter(Boolean).forEach((id) => dispatch(fetchPublicStore(id)))
  }, [dispatch, storeIds])

  // The cart may not be loaded yet if the customer opened /checkout directly.
  useEffect(() => {
    if (!cart) dispatch(fetchCart())
  }, [cart, dispatch])

  if (!results && cart && selectedIds.length === 0) return <Navigate to="/cart" replace />

  const methodFor = (group) => {
    const cod = codState(group, storesById[group.storePublicId], storeStatuses[group.storePublicId])
    const chosen = methods[group.storePublicId]
    return chosen === 'COD' && !cod.allowed ? 'BANK_TRANSFER' : (chosen ?? 'BANK_TRANSFER')
  }

  const handleResults = (data) => {
    const all = data?.results ?? []
    const placed = all.filter((r) => r.status === 'PLACED')
    const failed = all.filter((r) => r.status !== 'PLACED')
    dispatch(fetchCart()) // placed lines leave the cart; failed lines stay
    if (failed.length === 0 && placed.length > 0) {
      toast.success(placed.length === 1 ? 'Your order was placed.' : `${placed.length} orders were placed.`, 'Thank you!')
      navigate(placed.length === 1 ? `/orders/${placed[0].orderPublicId}` : '/orders', { replace: true })
      return
    }
    setResults(all)
  }

  const placeOrder = async () => {
    setFormError('')
    if (!addressId) {
      setFormError('Choose a delivery address.')
      return
    }
    const body = {
      cartItemIds: groups.flatMap((g) => g.lines.map((l) => l.cartItemPublicId)),
      addressPublicId: addressId,
      payments: groups.map((g) => ({ storePublicId: g.storePublicId, method: methodFor(g) })),
    }
    const key = idem.keyFor(body)
    setPlacing(true)
    try {
      const data = await ordersApi.checkout(body, key)
      idem.settle()
      handleResults(data)
    } catch (error) {
      idem.settle(error)
      // 422 = no store placed; the body has the same per-store results as a 201.
      if (error.status === 422 && Array.isArray(error.data?.results)) {
        handleResults(error.data)
      } else {
        if (error.code === 'CART_ITEM_NOT_FOUND') dispatch(fetchCart())
        setFormError(errorMessage(error))
        if (!WHOLE_REQUEST_CODES.includes(error.code) && (error.status === 0 || error.status >= 500)) {
          setFormError(`${errorMessage(error)} It is safe to press the button again: you will not be charged twice.`)
        }
      }
    } finally {
      setPlacing(false)
    }
  }

  if (results) {
    const placed = results.filter((r) => r.status === 'PLACED')
    return (
      <div className="mx-auto max-w-2xl">
        <PageHeader
          title={placed.length ? 'Some orders were placed' : 'Your order could not be placed'}
          description={
            placed.length
              ? 'The stores below accepted your order. Items from the other stores are still in your cart.'
              : 'Nothing was charged. Your items are still in your cart.'
          }
        />
        <ResultCards results={results} />
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button to="/cart" variant="outline">
            Back to cart
          </Button>
          {placed.length > 0 && <Button to={placed.length === 1 ? `/orders/${placed[0].orderPublicId}` : '/orders'}>View my orders</Button>}
        </div>
      </div>
    )
  }

  return (
    <>
      <PageHeader title="Checkout" breadcrumbs={[{ label: 'Cart', to: '/cart' }, { label: 'Checkout' }]} />
      <div className="lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-8">
        <div className="space-y-6">
          <AddressSection
            addresses={addresses}
            status={addressQuery.status}
            error={addressQuery.error}
            reload={addressQuery.reload}
            selectedId={addressId}
            onSelect={setAddressId}
          />

          <Card>
            <Card.Header
              title="2. Payment per store"
              description="The store will confirm availability and quote delivery first. You pay or confirm after the quote."
            />
            <Card.Body className="space-y-6">
              {groups.map((group) => {
                const cod = codState(group, storesById[group.storePublicId], storeStatuses[group.storePublicId])
                const method = methodFor(group)
                const name = `method-${group.storePublicId}`
                return (
                  <fieldset key={group.storePublicId}>
                    <legend className="mb-3 font-medium text-slate-900 dark:text-white">{group.storeName}</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <MethodOption
                        name={name}
                        icon={Landmark}
                        title="Bank transfer"
                        text="Transfer to the store's account after you confirm the quote."
                        checked={method === 'BANK_TRANSFER'}
                        onChange={() => setMethods((m) => ({ ...m, [group.storePublicId]: 'BANK_TRANSFER' }))}
                      />
                      <MethodOption
                        name={name}
                        icon={Banknote}
                        title="Cash on delivery"
                        text={cod.allowed ? 'Pay the courier when the parcel arrives.' : cod.reason}
                        checked={method === 'COD'}
                        disabled={!cod.allowed}
                        onChange={() => setMethods((m) => ({ ...m, [group.storePublicId]: 'COD' }))}
                      />
                    </div>
                  </fieldset>
                )
              })}
            </Card.Body>
          </Card>

          <Card>
            <Card.Header title="3. Items" description="The delivery charge is added by each store in its quote." />
            <Card.Body className="space-y-5">
              {groups.map((group) => (
                <div key={group.storePublicId}>
                  <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{group.storeName}</p>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.lines.map((line) => (
                      <li key={line.cartItemPublicId} className="flex items-center gap-3 py-2 text-sm">
                        <SmartImage src={line.imageUrl} alt="" name={line.productName} className="size-12 shrink-0 rounded-lg" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-slate-800 dark:text-slate-200">{line.productName}</p>
                          <p className="truncate text-xs text-slate-500">
                            {line.variantName} · Qty {line.quantity}
                          </p>
                        </div>
                        <span className="tabular-nums">{formatMoney(line.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </Card.Body>
          </Card>
        </div>

        <Card className="sticky top-24 mt-6 p-5 lg:mt-0">
          <h2 className="font-semibold text-slate-900 dark:text-white">Order summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Stores</dt>
              <dd>{groups.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Delivery</dt>
              <dd className="text-slate-500 dark:text-slate-400">Quoted by each store</dd>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <dt>Items total</dt>
              <dd className="tabular-nums">{formatMoney(itemsTotal)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Nothing is charged now. Each store sends you a quote with the delivery cost, and you confirm it first.
          </p>
          {formError && <FormAlert className="mt-4">{formError}</FormAlert>}
          <ShopperButton fullWidth size="lg" className="mt-5" loading={placing} disabled={!groups.length} onClick={placeOrder}>
            Place order{groups.length > 1 ? 's' : ''}
          </ShopperButton>
        </Card>
      </div>
    </>
  )
}
