// Session endpoints (contract 7.1 and section 3). All return the response body.
import { api, unwrap } from './client'

// -> TokenResponse
export const login = ({ email, password }) => unwrap(api.post('/api/auth/login', { email, password }))

// 204. The caller clears local state even if this fails.
export const logout = ({ refreshToken }) => unwrap(api.post('/api/auth/logout', { refreshToken }))

// -> a NEW TokenResponse; every other session of this user is revoked.
export const changePassword = ({ currentPassword, newPassword }) =>
  unwrap(api.post('/api/auth/change-password', { currentPassword, newPassword }))

// The refresh call lives in client.js (refreshSession) because it needs the lock and queue.
