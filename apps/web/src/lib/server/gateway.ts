import { getCookie, setCookie, deleteCookie } from '@tanstack/react-start/server'

// The single backend entry point. Server-side only — the browser never calls
// the gateway directly; it goes through these server functions (the BFF).
const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:8081'

export const ACCESS_COOKIE = 'zeus_access'
export const REFRESH_COOKIE = 'zeus_refresh'

export interface GatewayError extends Error {
  status: number
}

function gatewayError(status: number, message: string): GatewayError {
  const err = new Error(message) as GatewayError
  err.status = status
  return err
}

interface FetchOpts {
  method?: string
  body?: unknown
  auth?: boolean
  query?: Record<string, string | number | undefined>
}

function buildUrl(path: string, query?: FetchOpts['query']): string {
  const url = new URL(path, GATEWAY_URL)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined) url.searchParams.set(k, String(v))
    }
  }
  return url.toString()
}

/** Perform a request to the gateway, attaching the access-token cookie as a bearer. */
export async function gatewayFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.auth !== false) {
    const token = getCookie(ACCESS_COOKIE)
    if (token) headers['authorization'] = `Bearer ${token}`
  }

  const res = await fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  if (!res.ok) {
    let message = res.statusText
    try {
      const data = (await res.json()) as { message?: string; detail?: string }
      message = data.message ?? data.detail ?? message
    } catch {
      // non-JSON error body
    }
    throw gatewayError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function setAuthCookies(accessToken: string, refreshToken: string, expiresIn: number) {
  const base = { httpOnly: true, path: '/', sameSite: 'lax' as const }
  setCookie(ACCESS_COOKIE, accessToken, { ...base, maxAge: expiresIn })
  setCookie(REFRESH_COOKIE, refreshToken, { ...base, maxAge: 60 * 60 * 24 * 14 })
}

export function clearAuthCookies() {
  deleteCookie(ACCESS_COOKIE, { path: '/' })
  deleteCookie(REFRESH_COOKIE, { path: '/' })
}

export function getAccessToken(): string | undefined {
  return getCookie(ACCESS_COOKIE)
}

export function getRefreshToken(): string | undefined {
  return getCookie(REFRESH_COOKIE)
}

/** Decode (without verifying) the `sub` claim of the access token to get the user id. */
export function getUserId(): string | null {
  const token = getAccessToken()
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8'),
    ) as { sub?: string }
    return payload.sub ?? null
  } catch {
    return null
  }
}
