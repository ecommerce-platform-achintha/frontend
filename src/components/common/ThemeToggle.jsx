import { useDispatch, useSelector } from 'react-redux'
import { Moon, Sun } from 'lucide-react'
import { saveTheme, selectTheme, themeSet } from '@/store/slices/uiSlice'
import IconButton from '@/components/ui/IconButton'

export default function ThemeToggle() {
  const theme = useSelector(selectTheme)
  const dispatch = useDispatch()
  const dark = theme === 'dark'
  return (
    <IconButton
      icon={dark ? Sun : Moon}
      label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => {
        const next = dark ? 'light' : 'dark'
        saveTheme(next)
        dispatch(themeSet(next))
      }}
    />
  )
}
