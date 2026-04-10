/**
 * Auth-aware fetch wrapper.
 * Automatically attaches the Authorization header from localStorage
 * when a JWT token is stored there. Falls back to cookie-only if no token.
 */

const TOKEN_KEY = 'ipsc_auth_token'

export function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return {}

  return {
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Like fetch() but adds Authorization header from localStorage.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null
  const headers = new Headers(options.headers ?? {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(url, { ...options, headers })
}
