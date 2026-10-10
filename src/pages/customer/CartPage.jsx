import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ShoppingCart, Trash2, TriangleAlert } from 'lucide-react'
import {
  clearCart,
  fetchCart,
  isLineSelectable,
  removeCartLine,
  selectCart,
  selectCartError,
  selectCartStatus,
  selectCartStores,
  selectionChanged,
  selectSelectableIds,
  selectSelectedIds,
  selectSelectedLineCount,
  selectSelectedTotal,
  updateCartLine,
} from '@/store/slices/cartSlice'
import { errorMessage } from '@/config/errorMessages'
import { useDebounce } from '@/hooks/useDebounce'
import { useToast } from '@/hooks/useToast'
import { formatMoney } from '@/utils/format'
import AsyncContent from '@/components/common/AsyncContent'
import PageHeader from '@/components/common/PageHeader'
import ShopperButton from '@/components/common/ShopperButton'
import SmartImage from '@/components/common/SmartImage'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import EmptyState from '@/components/ui/EmptyState'
import IconButton from '@/components/ui/IconButton'
import QuantityStepper from '@/components/ui/QuantityStepper'

function issueText(line) {
  switch (line.issue) {
    case 'NOT_AVAILABLE':
      return 'This item is not available any more.'
    case 'INSUFFICIENT_STOCK':
      return line.availableQuantity > 0
        ? `Only ${line.availableQuantity} available. Lower the quantity to continue.`
        : 'Out of stock right now.'
    case 'REMOVED':
      return 'The store removed this item.'
    default:
      return line.available === false ? 'This item is not available right now.' : ''
  }
}

const attributesText = (attributes) =>
  attributes && typeof attributes === 'object'
    ? Object.entries(attributes)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ')
    : ''

function CartLine({ line, selected, onToggle }) {
  const dispatch = useDispatch()
  const toast = useToast()
  const [quantity, setQuantity] = useState(line.quantity)
  const debounced = useDebounce(quantity, 400)
  const [busy, setBusy] = useState(false)

  // When the server sends a new quantity (another tab, a correction), show it.
  const [serverQuantity, setServerQuantity] = useState(line.quantity)
  if (serverQuantity !== line.quantity) {
    setServerQuantity(line.quantity)
    setQuantity(line.quantity)
  }

  // Send the quantity 400 ms after the last click; the response replaces the cart.
  useEffect(() => {
    if (debounced === line.quantity) return
    dispatch(updateCartLine({ cartItemId: line.cartItemPublicId, quantity: debounced }))
      .unwrap()
      .catch((error) => {
        toast.error(errorMessage(error))
        setQuantity(line.quantity)
      })
    // Only react to the debounced value; line.quantity changes are handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const remove = async () => {
    setBusy(true)
    try {
      await dispatch(removeCartLine({ cartItemId: line.cartItemPublicId })).unwrap()
    } catch (error) {
      toast.error(errorMessage(error))
      setBusy(false)
    }
  }

  const selectable = isLineSelectable(line)
  const problem = issueText(line)

  return (
    <li className="flex gap-3 py-4 sm:gap-4">
      <div className="pt-1">
        <input
          type="checkbox"
          aria-label={`Select ${line.productName}`}
          checked={selected}
          disabled={!selectable}
          onChange={(e) => onToggle([line.cartItemPublicId], e.target.checked)}
          className="size-5 cursor-pointer rounded accent-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
        />
      </div>
      <Link to={`/products/${line.itemPublicId}`} className="shrink-0">
        <SmartImage src={line.imageUrl} alt="" name={line.productName} className="size-20 rounded-xl sm:size-24" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <Link
              to={`/products/${line.itemPublicId}`}
              className="line-clamp-2 font-medium text-slate-900 hover:text-primary-700 dark:text-white dark:hover:text-primary-300"
            >
              {line.productName}
            </Link>
            <p className="text-xs text-slate-500 dark:text-slate-400">{line.variantName || attributesText(line.attributes)}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-900 tabular-nums dark:text-white">{formatMoney(line.lineTotal)}</p>
            <p className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
              {formatMoney(line.unitPrice)} each
              {Number(line.discountAmount) > 0 && (
                <>
                  {' '}
                  · <span className="line-through">{formatMoney(line.listPrice)}</span>
                </>
              )}
            </p>
          </div>
        </div>
        {problem && (
          <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-warning-700 dark:text-warning-400">
            <TriangleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
            {problem}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={100}
            disabled={busy || line.issue === 'NOT_AVAILABLE' || line.issue === 'REMOVED'}
            label={`Quantity of ${line.productName}`}
          />
          <IconButton icon={Trash2} label={`Remove ${line.productName}`} variant="danger" size="sm" onClick={remove} disabled={busy} />
        </div>
      </div>
    </li>
  )
}

function StoreGroup({ store, selectedIds, onToggle }) {
  const selectable = store.lines.filter(isLineSelectable).map((l) => l.cartItemPublicId)
  const allSelected = selectable.length > 0 && selectable.every((id) => selectedIds.includes(id))
  return (
    <Card>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={selectable.length === 0}
            onChange={(e) => onToggle(selectable, e.target.checked)}
            aria-label={`Select all items from ${store.storeName}`}
            className="size-5 cursor-pointer rounded accent-primary-600 disabled:opacity-40"
          />
          <Link to={`/stores/${store.storePublicId}`} className="font-semibold text-slate-900 hover:text-primary-700 dark:text-white dark:hover:text-primary-300">
            {store.storeName}
          </Link>
        </label>
        <span className="text-sm text-slate-500 tabular-nums dark:text-slate-400">Subtotal {formatMoney(store.subtotal)}</span>
      </div>
      <ul className="divide-y divide-slate-100 px-5 dark:divide-slate-800">
        {store.lines.map((line) => (
          <CartLine key={line.cartItemPublicId} line={line} selected={selectedIds.includes(line.cartItemPublicId)} onToggle={onToggle} />
        ))}
      </ul>
    </Card>
  )
}

export default function CartPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const toast = useToast()
  const cart = useSelector(selectCart)
  const status = useSelector(selectCartStatus)
  const error = useSelector(selectCartError)
  const stores = useSelector(selectCartStores)
  const selectedIds = useSelector(selectSelectedIds)
  const selectableIds = useSelector(selectSelectableIds)
  const selectedCount = useSelector(selectSelectedLineCount)
  const selectedTotal = useSelector(selectSelectedTotal)
  const [confirmClear, setConfirmClear] = useState(false)

  // Always re-read: the server re-prices the cart on every read.
  useEffect(() => {
    dispatch(fetchCart())
  }, [dispatch])

  const toggle = (ids, selected) => dispatch(selectionChanged({ ids, selected }))
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id))

  const doClear = async () => {
    try {
      await dispatch(clearCart()).unwrap()
      setConfirmClear(false)
      toast.success('Your cart is empty.')
    } catch (err) {
      toast.error(errorMessage(err))
      throw err
    }
  }

  return (
    <>
      <PageHeader
        title="Your cart"
        description={cart?.lineCount ? `${cart.lineCount} item${cart.lineCount === 1 ? '' : 's'} from ${stores.length} store${stores.length === 1 ? '' : 's'}` : undefined}
        actions={
          stores.length > 0 && (
            <Button variant="ghost" leftIcon={Trash2} onClick={() => setConfirmClear(true)}>
              Clear cart
            </Button>
          )
        }
      />

      <AsyncContent
        status={status}
        error={error}
        hasData={Boolean(cart)}
        onRetry={() => dispatch(fetchCart())}
        isEmpty={stores.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={ShoppingCart}
              title="Your cart is empty"
              description="Find something you like and add it here."
              action={<Button to="/search">Start shopping</Button>}
            />
          </Card>
        }
      >
        <div className="lg:grid lg:grid-cols-[1fr_20rem] lg:items-start lg:gap-8">
          <div className="space-y-4">
            <label className="flex items-center gap-3 px-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={allSelected}
                disabled={selectableIds.length === 0}
                onChange={(e) => toggle(selectableIds, e.target.checked)}
                className="size-5 cursor-pointer rounded accent-primary-600"
              />
              Select all available
            </label>
            {stores.map((store) => (
              <StoreGroup key={store.storePublicId} store={store} selectedIds={selectedIds} onToggle={toggle} />
            ))}
          </div>

          <Card className="sticky top-24 mt-6 p-5 lg:mt-0">
            <h2 className="font-semibold text-slate-900 dark:text-white">Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500 dark:text-slate-400">Selected items</dt>
                <dd className="tabular-nums">{selectedCount}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Items total</dt>
                <dd className="tabular-nums">{formatMoney(selectedTotal)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Delivery is added by each store in its quote. You confirm the final total before paying.
            </p>
            <ShopperButton fullWidth size="lg" className="mt-5" disabled={selectedCount === 0} onClick={() => navigate('/checkout')}>
              Checkout ({selectedCount} item{selectedCount === 1 ? '' : 's'})
            </ShopperButton>
          </Card>
        </div>
      </AsyncContent>

      <ConfirmDialog
        open={confirmClear}
        title="Clear your cart?"
        message="All items will be removed from your cart."
        confirmLabel="Clear cart"
        tone="danger"
        onConfirm={doClear}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  )
}
