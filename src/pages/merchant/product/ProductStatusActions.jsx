import { useState } from 'react'
import * as catalogApi from '@/api/catalog'
import { PRODUCT_STATUS_MOVES } from '@/config/enums'
import { errorMessage } from '@/config/errorMessages'
import { PRODUCT_STATUS_ACTIONS } from '@/config/merchant'
import { ACTION_ACCESS } from '@/config/permissions'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { useToast } from '@/hooks/useToast'
import PermissionButton from '@/components/common/PermissionButton'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const NOT_APPROVED = 'Your account must be approved before products can go live.'

const CONFIRM = {
  ARCHIVED: { title: 'Archive this product?', message: 'Customers will not see it any more. You can restore it to draft later.', label: 'Archive', tone: 'danger' },
  DRAFT: { title: 'Move back to draft?', message: 'The product is hidden from customers until you activate it again.', label: 'Back to draft', tone: 'primary' },
}

// Status buttons for the allowed moves (DRAFT↔ACTIVE, →ARCHIVED, ARCHIVED→DRAFT).
export default function ProductStatusActions({ product, onChanged }) {
  const toast = useToast()
  const { isPending } = useMerchantStatus()
  const [confirming, setConfirming] = useState(null) // target status
  const [error, setError] = useState('')

  const move = async (target) => {
    setError('')
    try {
      const saved = await catalogApi.setProductStatus(product.publicId, target)
      setConfirming(null)
      toast.success(target === 'ACTIVE' ? 'Product is live.' : target === 'ARCHIVED' ? 'Product archived.' : 'Product moved to draft.')
      onChanged(saved)
    } catch (err) {
      let message = errorMessage(err)
      if (err?.code === 'PRODUCT_NOT_SELLABLE') message = 'This product cannot go live yet: it needs at least one active variant.'
      if (err?.code === 'MERCHANT_NOT_APPROVED') message = NOT_APPROVED
      if (err?.code === 'INVALID_STATUS_TRANSITION' || err?.code === 'CONCURRENT_MODIFICATION') onChanged(null) // reload
      if (confirming) setError(message)
      else toast.error(message)
      throw err
    }
  }

  const targets = PRODUCT_STATUS_MOVES[product.status] ?? []
  return (
    <>
      {targets.map((target) => (
        <PermissionButton
          key={target}
          perms={ACTION_ACCESS.editProduct}
          variant={target === 'ACTIVE' ? 'success' : 'outline'}
          size="sm"
          blockedReason={target === 'ACTIVE' && isPending ? NOT_APPROVED : undefined}
          onClick={() => (CONFIRM[target] ? setConfirming(target) : move(target).catch(() => {}))}
        >
          {PRODUCT_STATUS_ACTIONS[`${product.status}>${target}`]}
        </PermissionButton>
      ))}
      <ConfirmDialog
        open={confirming !== null}
        title={CONFIRM[confirming]?.title}
        message={CONFIRM[confirming]?.message}
        confirmLabel={CONFIRM[confirming]?.label}
        tone={CONFIRM[confirming]?.tone}
        error={error}
        onConfirm={() => move(confirming)}
        onCancel={() => {
          setConfirming(null)
          setError('')
        }}
      />
    </>
  )
}
