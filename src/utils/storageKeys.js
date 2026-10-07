// There is no upload API (contract section 10.1). We only generate storage keys that match
// the backend regex; nothing is uploaded. Keys look like "uploads/<uuid>/<sanitised-name>".

export const STORAGE_KEY_REGEX = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,199}$/
const MAX_KEY_LENGTH = 200

// Keeps letters, digits, dot, underscore and dash; everything else becomes a dash.
export function sanitizeFileName(name) {
  const cleaned = String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // drop accents: "café" -> "cafe"
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[^A-Za-z0-9]+/, '') // must start with a letter or digit
    .replace(/[-.]+$/, '')
  return cleaned || 'file'
}

export function createStorageKey(fileName, folder = 'uploads') {
  const prefix = `${folder}/${crypto.randomUUID()}/`
  const safeName = sanitizeFileName(fileName).slice(0, MAX_KEY_LENGTH - prefix.length)
  const key = prefix + (safeName || 'file')
  // Defensive: should always pass, but never send an invalid key.
  return STORAGE_KEY_REGEX.test(key) ? key : `${prefix}file`
}

export function isValidStorageKey(key) {
  return typeof key === 'string' && STORAGE_KEY_REGEX.test(key)
}
