import { useId, useState } from 'react'
import * as catalogApi from '@/api/catalog'
import * as storesApi from '@/api/stores'
import { MAX_REVIEW_ATTACHMENTS } from '@/config/constants'
import { REVIEW_TEXT_MAX } from '@/config/catalog'
import { errorMessage } from '@/config/errorMessages'
import FormAlert from '@/components/common/FormAlert'
import Button from '@/components/ui/Button'
import FilePicker from '@/components/ui/FilePicker'
import FormField from '@/components/ui/FormField'
import Modal from '@/components/ui/Modal'
import RatingStars from '@/components/ui/RatingStars'
import Select from '@/components/ui/Select'
import Textarea from '@/components/ui/Textarea'

/**
 * Review a store or a product from a completed order.
 * target: { kind: 'store', storePublicId, name }
 *       | { kind: 'product', productPublicId, name, variants: [{ variantPublicId, label }] }
 * onDone(target) runs after a successful review, or when the server says it already exists.
 */
export default function ReviewModal({ open, target, orderPublicId, onClose, onDone }) {
  const formId = useId()
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [keys, setKeys] = useState([])
  const [variantId, setVariantId] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset the form each time a different target opens.
  const targetKey = target ? `${target.kind}:${target.storePublicId ?? target.productPublicId}` : ''
  const [lastKey, setLastKey] = useState(targetKey)
  if (lastKey !== targetKey) {
    setLastKey(targetKey)
    setRating(0)
    setText('')
    setKeys([])
    setVariantId('')
    setError('')
  }

  if (!target) return null
  const variants = target.variants ?? []
  // Contract 7.3: variantPublicId only when the order has several variants of this product.
  const needsVariant = target.kind === 'product' && variants.length > 1

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (rating < 1) return setError('Choose a rating from 1 to 5 stars.')
    if (needsVariant && !variantId) return setError('Choose which item you are reviewing.')
    const body = {
      orderPublicId,
      rating,
      text: text.trim() || undefined,
      attachmentKeys: keys.length ? keys : undefined,
    }
    setSaving(true)
    try {
      if (target.kind === 'store') await storesApi.createStoreReview(target.storePublicId, body)
      else await catalogApi.createProductReview(target.productPublicId, { ...body, variantPublicId: needsVariant ? variantId : undefined })
      onDone?.(target, 'created')
    } catch (err) {
      if (err.code === 'REVIEW_ALREADY_EXISTS') onDone?.(target, 'exists')
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={target.kind === 'store' ? `Review ${target.name}` : `Review “${target.name}”`}
      dismissible={!saving}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Post review
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} noValidate className="space-y-5">
        {error && <FormAlert>{error}</FormAlert>}
        <div>
          <p className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">Your rating</p>
          <RatingStars value={rating} onChange={setRating} size="lg" />
        </div>
        {needsVariant && (
          <FormField label="Which item?" required>
            <Select
              value={variantId}
              onChange={(e) => setVariantId(e.target.value)}
              placeholder="Choose"
              options={variants.map((v) => ({ value: v.variantPublicId, label: v.label }))}
            />
          </FormField>
        )}
        <FormField label="Your review" hint="Optional">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={REVIEW_TEXT_MAX} rows={4} />
        </FormField>
        <FormField label="Photos" hint={`Optional, up to ${MAX_REVIEW_ATTACHMENTS}.`}>
          <FilePicker value={keys} onChange={setKeys} maxFiles={MAX_REVIEW_ATTACHMENTS} folder="reviews" label="Add photos" />
        </FormField>
      </form>
    </Modal>
  )
}
