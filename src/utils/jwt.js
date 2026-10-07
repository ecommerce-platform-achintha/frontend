// Decodes the payload of a JWT without verifying it (the server verifies; we only read claims).
// Uses base64url + UTF-8 decoding so non-ASCII characters survive.

function base64UrlToBytes(input) {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  // atob needs padding to a multiple of 4.
  while (base64.length % 4 !== 0) base64 += '='
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Returns the claims the UI uses, or null if the token cannot be read.
 * @returns {{ sub, pid, role, status, storeId, perms: string[], exp } | null}
 */
export function decodeJwt(token) {
  if (typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(parts[1]))
    const payload = JSON.parse(json)
    return {
      sub: payload.sub ?? null,
      pid: payload.pid ?? null,
      role: payload.role ?? null,
      status: payload.status ?? null,
      storeId: payload.storeId ?? null, // merchant and assistant only (a UUID, never shown)
      perms: Array.isArray(payload.perms) ? payload.perms : [], // assistant only
      exp: typeof payload.exp === 'number' ? payload.exp : null, // seconds since epoch
    }
  } catch {
    return null
  }
}

// True when the token expires within `skewSeconds` (default 30 s) or cannot be read.
export function isJwtExpired(token, skewSeconds = 30) {
  const claims = decodeJwt(token)
  if (!claims?.exp) return true
  return claims.exp * 1000 - skewSeconds * 1000 <= Date.now()
}
