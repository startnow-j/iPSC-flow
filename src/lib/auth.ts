import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

// JWT secret for MVP (constant, not from env for simplicity)
const JWT_SECRET = new TextEncoder().encode(
  'ipsc-production-mgmt-jwt-secret-key-2025-mvp'
)

const COOKIE_NAME = 'ipsc_session'

// Token expiry: 7 days
const TOKEN_EXPIRY = '7d'

export interface JWTPayload {
  userId: string
  email: string
  role: string
  name: string
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Verify a password against a bcrypt hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Create a JWT token for a user
 */
export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(JWT_SECRET)
}

/**
 * Verify a JWT token and return the payload
 */
export async function verifyToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

/**
 * Extract JWT token from request — checks Authorization header first,
 * then falls back to cookie. This handles Caddy proxy cookie issues.
 */
export function getTokenFromRequest(request: Request): string | null {
  // 1. Check Authorization header (most reliable for proxy setups)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // 2. Fall back to cookie
  const cookies = Object.fromEntries(
    (request.headers.get('cookie') || '').split(';').map(c => {
      const [key, ...val] = c.trim().split('=')
      return [key, val.join('=')]
    })
  )
  return cookies[COOKIE_NAME] ?? null
}

/**
 * Extract JWT token from request cookies only (legacy helper)
 */
export function getTokenFromCookies(
  cookies: Record<string, string | undefined>
): string | null {
  return cookies[COOKIE_NAME] ?? null
}

export { COOKIE_NAME }
