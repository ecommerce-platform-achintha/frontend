import { useEffect } from 'react'

// Calls `onOutside` on a pointer down outside `ref` or on Escape (menus, popovers).
export function useClickOutside(ref, onOutside, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined
    const onPointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onOutside()
    }
    const onKey = (event) => {
      if (event.key === 'Escape') onOutside()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, onOutside, enabled])
}
