// Theme, toasts and global banners.
import { createSlice, nanoid } from '@reduxjs/toolkit'
import { THEME_STORAGE_KEY } from '@/config/constants'

// index.html already applied the theme before React loaded; start from what it decided.
function initialTheme() {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: initialTheme(), // 'light' | 'dark'
    toasts: [], // { id, type: success|error|info|warning, title, message }
    banners: [], // { id, type, message } shown under the header in every layout
  },
  reducers: {
    themeSet(state, action) {
      state.theme = action.payload === 'dark' ? 'dark' : 'light'
    },
    themeToggled(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
    },
    toastAdded: {
      reducer(state, action) {
        state.toasts.push(action.payload)
        // Keep at most 4 on screen.
        if (state.toasts.length > 4) state.toasts.shift()
      },
      prepare({ type = 'info', title, message }) {
        return { payload: { id: nanoid(), type, title, message } }
      },
    },
    toastDismissed(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload)
    },
    bannerShown: {
      reducer(state, action) {
        // One banner per id: showing it again replaces it.
        state.banners = state.banners.filter((b) => b.id !== action.payload.id)
        state.banners.push(action.payload)
      },
      prepare({ id, type = 'info', message }) {
        return { payload: { id: id ?? nanoid(), type, message } }
      },
    },
    bannerDismissed(state, action) {
      state.banners = state.banners.filter((b) => b.id !== action.payload)
    },
  },
})

export const { themeSet, themeToggled, toastAdded, toastDismissed, bannerShown, bannerDismissed } = uiSlice.actions
export default uiSlice.reducer

export const selectTheme = (state) => state.ui.theme
export const selectToasts = (state) => state.ui.toasts
export const selectBanners = (state) => state.ui.banners

// Applies the theme to <html>. Called from an effect in AppRoot whenever the theme changes.
export function applyThemeClass(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

// Remembers an explicit choice. Until the user picks one, the OS preference is followed.
export function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // ignore
  }
}
