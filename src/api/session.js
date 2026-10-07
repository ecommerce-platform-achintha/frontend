// Persists the login session in localStorage under the `mp.` prefix.
// The backend returns tokens in the JSON body only, so browser storage is the only option
// (contract section 3). Never log anything read from here.

export const SESSION_KEY = 'mp.session'

/**
 * Session shape:
 * { accessToken, refreshToken, expiresAt, refreshTokenExpiresAt,
 *   publicId, role, status, statusReason, mustChangePassword }
 */
export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    return session?.accessToken && session?.refreshToken ? session : null
  } catch {
    return null
  }
}

export function writeSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Storage full or blocked: the session still lives in memory (Redux) for this tab.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

// Builds our session object from a TokenResponse (login, refresh, change-password).
export function sessionFromTokenResponse(data) {
  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    expiresAt: data.expiresAt ?? null,
    refreshTokenExpiresAt: data.refreshTokenExpiresAt ?? null,
    publicId: data.publicId ?? null,
    role: data.role ?? null,
    status: data.status ?? null,
    statusReason: data.statusReason ?? null,
    mustChangePassword: Boolean(data.mustChangePassword),
  }
}

function isPast(isoString, skewSeconds) {
  if (!isoString) return false
  const time = new Date(isoString).getTime()
  return Number.isFinite(time) && time - skewSeconds * 1000 <= Date.now()
}

// The access token lives 10 minutes. Treat it as expired 30 s early so requests do not race the clock.
export function isAccessTokenExpired(session, skewSeconds = 30) {
  if (!session?.accessToken) return true
  return isPast(session.expiresAt, skewSeconds)
}

export function isRefreshTokenExpired(session) {
  if (!session?.refreshToken) return true
  return isPast(session.refreshTokenExpiresAt, 0)
}
