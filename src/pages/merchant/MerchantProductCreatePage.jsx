import { useNavigate } from 'react-router-dom'
import * as catalogApi from '@/api/catalog'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'
import { useToast } from '@/hooks/useToast'
import FormAlert from '@/components/common/FormAlert'
import PageHeader from '@/components/common/PageHeader'
import ProductForm from './product/ProductForm'

export default function MerchantProductCreatePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { readOnly, isPending } = useMerchantStatus()

  const create = async (body) => {
    const product = await catalogApi.createProduct(body)
    toast.success('Product saved as a draft. Activate it when it is ready.')
    navigate(product?.publicId ? `/merchant/products/${product.publicId}` : '/merchant/products?tab=DRAFT', { replace: true })
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: 'Products', to: '/merchant/products' }, { label: 'New product' }]}
        title="New product"
        description="New products start as drafts. Customers see them only after you activate them."
      />
      {readOnly ? (
        <FormAlert>Your store is banned, so products cannot be created.</FormAlert>
      ) : (
        <div className="space-y-4">
          {isPending && <FormAlert tone="info">You can create drafts now. Products can go live after your account is approved.</FormAlert>}
          <ProductForm onSubmit={create} onCancel={() => navigate('/merchant/products')} submitLabel="Create draft" />
        </div>
      )}
    </>
  )
}
