// Shared settings read for components that only need a value (e.g. timers.ban-grace-days).
let request = null

export const settingsCache = {
  load(fetchSettings) {
    request ??= fetchSettings().catch((error) => {
      request = null
      throw error
    })
    return request
  },
  clear() {
    request = null
  },
}
