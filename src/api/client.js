// The one Axios instance for the whole app. Only files in src/api may use it.
//
// What it does:
// 1. Adds `Authorization: Bearer <token>` except on public/login/refresh/register URLs.
// 2. On a 401 it refreshes the session ONCE (single flight, cross-tab lock) and replays the request once.
// 3. Turns every failure into the same plain object: { status, code, message, fieldErrors, retryAfter, data }.
import axios from 'axios'
import {
  clearSession,
  isAccessTokenExpired,
  readSession,
  sessionFromTokenResponse,
  writeSession,
} from './session'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false, // auth is a Bearer token; never send cookies
  timeout: 15000,
  // Arrays become status=A&status=B (not status[]=A), as the backend expects.
  paramsSerializer: { indexes: null },
})

// ---------------------------------------------------------------------------
// Hooks the app registers at start-up (keeps this file free of Redux/router imports).
// ---------------------------------------------------------------------------
const handlers = {
  onSessionChanged: () => {}, // (session) => void, after a refresh
  onSessionExpired: () => {}, // () => void, refresh failed: session already cleared
  onPasswordChangeRequired: () => {}, // () => void, any 403 PASSWORD_CHANGE_REQUIRED
}

export function configureApiClient(next) {
  Object.assign(handlers, next)
}

// ---------------------------------------------------------------------------
// URL rules (contract section 3)
// ---------------------------------------------------------------------------
const NO_AUTH_PATHS = [
  /^\/api\/public(\/|$)/,
  /^\/api\/auth\/login$/,
  /^\/api\/auth\/refresh$/,
  /^\/api\/users\/register(\/|$)/,
]

// Path part of a request URL, without base URL or query string.
function pathOf(config) {
  let url = config.url ?? ''
  if (url.startsWith(BASE_URL)) url = url.slice(BASE_URL.length)
  return url.split('?')[0]
}

const isNoAuthPath = (path) => NO_AUTH_PATHS.some((re) => re.test(path))
const isAuthPath = (path) => path.startsWith('/api/auth/')

// ---------------------------------------------------------------------------
// Error normalisation
// ---------------------------------------------------------------------------
const DEFAULT_MESSAGES = {
  0: 'Cannot reach the server. Check your connection and try again.',
  400: 'The request was not valid.',
  401: 'Please sign in again.',
  403: 'You do not have access to this.',
  404: 'Not found.',
  409: 'This was changed by someone else. Reload and try again.',
  422: 'The request could not be completed.',
  429: 'Too many requests. Please wait and try again.',
  500: 'Something went wrong on our side.',
  503: 'The service is busy. Please try again.',
}

// Retry-After can be seconds ("30") or an HTTP date.
function parseRetryAfter(value) {
  if (value === undefined || value === null || value === '') return null
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds))
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, Math.ceil((date - Date.now()) / 1000)) : null
}

/**
 * Turns anything thrown by Axios into a plain, serialisable object.
 * `data` keeps the raw JSON body (needed for the checkout 422 response).
 */
export function normalizeError(error) {
  if (error?.isApiError) return error

  const response = error?.response
  if (!response) {
    const timedOut = error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT'
    return {
      isApiError: true,
      status: 0,
      code: timedOut ? 'TIMEOUT' : 'NETWORK_ERROR',
      message: timedOut ? 'The server took too long to answer. Please try again.' : DEFAULT_MESSAGES[0],
      fieldErrors: [],
      retryAfter: null,
      data: null,
    }
  }

  const { status, data, headers } = response
  // Non-JSON bodies (HTML error pages, empty bodies) are ignored.
  const body = data && typeof data === 'object' && !Array.isArray(data) ? data : null
  const fallbackMessage = DEFAULT_MESSAGES[status] ?? (status >= 500 ? DEFAULT_MESSAGES[500] : 'Something went wrong.')

  return {
    isApiError: true,
    status,
    code: body?.code ?? `HTTP_${status}`,
    message: body?.message || fallbackMessage,
    fieldErrors: Array.isArray(body?.fieldErrors) ? body.fieldErrors : [],
    retryAfter: parseRetryAfter(headers?.['retry-after']),
    data: body,
  }
}

/**
 * Maps server fieldErrors to { fieldName: message } for forms.
 * Nested names like "variants[0].sku" are kept as-is. The first message per field wins.
 */
export function fieldErrorsToMap(error) {
  const map = {}
  for (const item of error?.fieldErrors ?? []) {
    if (item?.field && !map[item.field]) map[item.field] = item.message
  }
  return map
}

// ---------------------------------------------------------------------------
// Idempotency (checkout and payment submission)
// ---------------------------------------------------------------------------

// One key per user intent; keep it while retrying the same payload (contract section 2).
export function newIdempotencyKey() {
  return crypto.randomUUID()
}

// Usage: api.post(url, body, withIdempotencyKey(key))
export function withIdempotencyKey(key, config = {}) {
  return { ...config, headers: { ...config.headers, 'Idempotency-Key': key } }
}

// ---------------------------------------------------------------------------
// Refresh: one in flight per tab, serialised across tabs with a Web Lock
// ---------------------------------------------------------------------------
let refreshInFlight = null

function withRefreshLock(task) {
  if (typeof navigator !== 'undefined' && navigator.locks?.request) {
    return navigator.locks.request('mp-refresh', task)
  }
  return task() // very old browsers: single-tab protection only
}

/**
 * Gets a fresh session. `staleAccessToken` is the token that failed (or is expired).
 * Concurrent callers share the same promise.
 */
export function refreshSession(staleAccessToken) {
  if (!refreshInFlight) {
    refreshInFlight = withRefreshLock(async () => {
      // Re-read inside the lock: another tab may have refreshed while we waited.
      // A refresh token is single use, so sending the old one again would end the whole login.
      const current = readSession()
      if (!current) throw normalizeError({ response: { status: 401, data: { code: 'UNAUTHORIZED' } } })
      if (current.accessToken !== staleAccessToken && !isAccessTokenExpired(current)) {
        return current
      }
      const { data } = await api.post('/api/auth/refresh', { refreshToken: current.refreshToken })
      // Keep flags the refresh response may not repeat.
      const next = { ...current, ...sessionFromTokenResponse(data) }
      writeSession(next) // persist BEFORE the lock is released
      return next
    })
      .then((session) => {
        handlers.onSessionChanged(session)
        return session
      })
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

function expireSession() {
  const hadSession = Boolean(readSession())
  clearSession()
  if (hadSession) handlers.onSessionExpired()
}

// A refresh that the server answered with 4xx means the session is gone.
// Network errors and 5xx keep the session so the user can retry.
const refreshWasRejected = (error) => error?.status >= 400 && error?.status < 500

// ---------------------------------------------------------------------------
// Interceptors
// ---------------------------------------------------------------------------
api.interceptors.request.use(async (config) => {
  const path = pathOf(config)
  if (isNoAuthPath(path)) {
    // Never send a token here: an expired one would turn a public call into a 401.
    delete config.headers.Authorization
    return config
  }

  let session = readSession()
  // Refresh early if the token is already expired (saves a guaranteed 401 round trip).
  // Logout is skipped: its body carries the refresh token, which a refresh would consume.
  if (session && isAccessTokenExpired(session) && path !== '/api/auth/logout') {
    try {
      session = await refreshSession(session.accessToken)
    } catch (error) {
      if (refreshWasRejected(error)) expireSession()
      throw error
    }
  }
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`
    config._sentAccessToken = session.accessToken
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config
    const status = error?.response?.status
    const path = config ? pathOf(config) : ''

    if (status === 401 && config && !isAuthPath(path) && !isNoAuthPath(path)) {
      if (config._retried) {
        // Even a fresh token was refused (revoked session).
        expireSession()
      } else if (config._sentAccessToken) {
        try {
          await refreshSession(config._sentAccessToken)
          config._retried = true
          return api(config) // the request interceptor attaches the new token
        } catch (refreshError) {
          if (refreshWasRejected(refreshError)) expireSession()
          return Promise.reject(normalizeError(refreshError))
        }
      }
    }

    const normalized = normalizeError(error)
    if (normalized.code === 'PASSWORD_CHANGE_REQUIRED') handlers.onPasswordChangeRequired()
    return Promise.reject(normalized)
  },
)

// Small helper so modules can write `return unwrap(api.get(...))`.
export async function unwrap(request) {
  const response = await request
  return response.data
}
