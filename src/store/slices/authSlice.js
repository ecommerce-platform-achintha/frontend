// Session, decoded token claims and the user's profile.
import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import * as authApi from '@/api/auth'
import * as usersApi from '@/api/users'
import { refreshSession } from '@/api/client'
import {
  clearSession,
  isAccessTokenExpired,
  isRefreshTokenExpired,
  readSession,
  sessionFromTokenResponse,
  writeSession,
} from '@/api/session'
import { decodeJwt } from '@/utils/jwt'
import { ROLES, userHasPerm } from '@/config/permissions'

const storedSession = readSession()

const initialState = {
  session: storedSession, // { accessToken, refreshToken, expiresAt, ..., mustChangePassword }
  claims: decodeJwt(storedSession?.accessToken),
  profile: null, // from GET /api/users/me
  profileStatus: 'idle', // idle | loading | succeeded | failed
  // The app shows a splash screen until bootstrap finishes (token refresh + profile).
  bootStatus: 'idle', // idle | loading | ready
}

// ---------------------------------------------------------------------------
// Thunks
// ---------------------------------------------------------------------------

export const fetchProfile = createAsyncThunk('auth/fetchProfile', async (_, { rejectWithValue }) => {
  try {
    const profile = await usersApi.getMe()
    // The profile is fresher than the stored login response for these flags; keep storage in sync.
    const stored = readSession()
    if (stored && profile) {
      writeSession({
        ...stored,
        mustChangePassword: Boolean(profile.mustChangePassword),
        status: profile.status ?? stored.status,
        statusReason: profile.statusReason ?? null,
      })
    }
    return profile
  } catch (error) {
    return rejectWithValue(error)
  }
})

// Runs once on load: restore the session, refresh it if the access token expired, load the profile.
export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrap',
  async (_, { dispatch }) => {
    let session = readSession()
    if (!session) return null
    if (isRefreshTokenExpired(session)) {
      clearSession()
      return null
    }
    if (isAccessTokenExpired(session)) {
      try {
        session = await refreshSession(session.accessToken)
      } catch (error) {
        // 4xx: the refresh token is no longer valid. Network/5xx: keep it and try later.
        if (error?.status >= 400 && error?.status < 500) {
          clearSession()
          return null
        }
      }
    }
    if (!session.mustChangePassword) await dispatch(fetchProfile())
    return session
  },
  {
    // Run once per page load (React StrictMode mounts effects twice in development).
    condition: (_, { getState }) => getState().auth.bootStatus === 'idle',
  },
)

export const login = createAsyncThunk('auth/login', async ({ email, password }, { dispatch, rejectWithValue }) => {
  try {
    const session = sessionFromTokenResponse(await authApi.login({ email, password }))
    writeSession(session)
    dispatch(sessionUpdated(session))
    // A user with a temporary password gets 403 everywhere except change-password.
    if (!session.mustChangePassword) await dispatch(fetchProfile())
    return session
  } catch (error) {
    return rejectWithValue(error)
  }
})

export const changePassword = createAsyncThunk('auth/changePassword', async (body, { dispatch, rejectWithValue }) => {
  try {
    // Returns a NEW TokenResponse; all other sessions are revoked.
    const session = sessionFromTokenResponse(await authApi.changePassword(body))
    writeSession(session)
    dispatch(sessionUpdated(session))
    await dispatch(fetchProfile())
    return session
  } catch (error) {
    return rejectWithValue(error)
  }
})

// Clears local state even if the server call fails.
export const logout = createAsyncThunk('auth/logout', async () => {
  const session = readSession()
  try {
    if (session?.refreshToken) await authApi.logout({ refreshToken: session.refreshToken })
  } catch {
    // ignore: we sign out locally anyway
  } finally {
    clearSession()
  }
})

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

function applySession(state, session) {
  state.session = session
  state.claims = decodeJwt(session?.accessToken)
}

function resetToGuest(state) {
  state.session = null
  state.claims = null
  state.profile = null
  state.profileStatus = 'idle'
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // After a token refresh (this tab or another tab via the storage event).
    sessionUpdated(state, action) {
      if (action.payload) applySession(state, action.payload)
      else resetToGuest(state)
    },
    // Refresh failed: the API client already cleared storage.
    sessionExpired(state) {
      resetToGuest(state)
    },
    // Any 403 PASSWORD_CHANGE_REQUIRED (main.jsx also saves the flag to storage).
    passwordChangeRequired(state) {
      if (state.session) state.session.mustChangePassword = true
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.pending, (state) => {
        state.bootStatus = 'loading'
      })
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        if (action.payload) applySession(state, action.payload)
        else resetToGuest(state)
        state.bootStatus = 'ready'
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.bootStatus = 'ready'
      })
      .addCase(fetchProfile.pending, (state) => {
        state.profileStatus = 'loading'
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.profileStatus = 'succeeded'
        state.profile = action.payload
        if (state.session && action.payload) {
          state.session.mustChangePassword = Boolean(action.payload.mustChangePassword)
          state.session.status = action.payload.status ?? state.session.status
          state.session.statusReason = action.payload.statusReason ?? null
        }
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.profileStatus = 'failed'
        if (action.payload?.code === 'PASSWORD_CHANGE_REQUIRED' && state.session) {
          state.session.mustChangePassword = true
        }
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        applySession(state, action.payload)
      })
      .addCase(logout.fulfilled, resetToGuest)
      .addCase(logout.rejected, resetToGuest)
  },
})

export const { sessionUpdated, sessionExpired, passwordChangeRequired } = authSlice.actions
export default authSlice.reducer

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------
const EMPTY = []

export const selectAuth = (state) => state.auth
export const selectSession = (state) => state.auth.session
export const selectClaims = (state) => state.auth.claims
export const selectProfile = (state) => state.auth.profile
export const selectProfileStatus = (state) => state.auth.profileStatus
export const selectBootStatus = (state) => state.auth.bootStatus
export const selectIsAuthenticated = (state) => Boolean(state.auth.session?.accessToken)
export const selectRole = (state) => state.auth.claims?.role ?? state.auth.session?.role ?? null
export const selectUserPublicId = (state) => state.auth.claims?.pid ?? state.auth.session?.publicId ?? null
// storeId only comes from the token (GET /me does not return it). Never display it.
export const selectStoreId = (state) => state.auth.claims?.storeId ?? null
export const selectPerms = (state) => state.auth.claims?.perms ?? EMPTY
export const selectMustChangePassword = (state) => Boolean(state.auth.session?.mustChangePassword)

// Profile first (freshest), then login response, then token claim.
export const selectUserStatus = (state) =>
  state.auth.profile?.status ?? state.auth.session?.status ?? state.auth.claims?.status ?? null
export const selectStatusReason = (state) => state.auth.profile?.statusReason ?? state.auth.session?.statusReason ?? null

export const selectDisplayName = createSelector([selectProfile], (profile) => {
  if (!profile) return ''
  return [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email || ''
})

// { role, status, perms } for permission helpers and landing paths.
export const selectAccessUser = createSelector([selectRole, selectUserStatus, selectPerms], (role, status, perms) => ({
  role,
  status,
  perms,
}))

export const selectIsCustomer = (state) => selectRole(state) === ROLES.CUSTOMER
export const selectHasPerm = (state, perm) => userHasPerm({ role: selectRole(state), perms: selectPerms(state) }, perm)
