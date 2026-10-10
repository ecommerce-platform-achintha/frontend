import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCategories, selectCategoryTree } from '@/store/slices/categoriesSlice'
import Select from '@/components/ui/Select'

// Category tree as a select: parents as options (they include their children), children indented.
// The value is the category slug.
export default function CategorySelect({ value, onChange, ...props }) {
  const dispatch = useDispatch()
  const tree = useSelector(selectCategoryTree)

  useEffect(() => {
    dispatch(fetchCategories())
  }, [dispatch])

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} {...props}>
      <option value="">All categories</option>
      {tree.map((parent) => [
        <option key={parent.slug} value={parent.slug}>
          {parent.name}
        </option>,
        ...parent.children.map((child) => (
          <option key={child.slug} value={child.slug}>
            {'   '}
            {child.name}
          </option>
        )),
      ])}
    </Select>
  )
}
