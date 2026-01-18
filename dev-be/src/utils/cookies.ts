import type { CookieOptions } from 'express'
import { env } from './env.js'

const isProduction = env.NODE_ENV === 'production'

const durationToMs = (value: string, fallback: number) => {
  const match = /^(\d+)([smhd])$/.exec(value)
  if (!match) return fallback

  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return fallback

  switch (match[2]) {
    case 's':
      return amount * 1000
    case 'm':
      return amount * 60 * 1000
    case 'h':
      return amount * 60 * 60 * 1000
    case 'd':
      return amount * 24 * 60 * 60 * 1000
    default:
      return fallback
  }
}

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
}

if (env.COOKIE_DOMAIN) {
  baseCookieOptions.domain = env.COOKIE_DOMAIN
}

export const accessTokenCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions,
  maxAge: durationToMs(env.JWT_ACCESS_TTL, 15 * 60 * 1000),
  path: '/',
})

export const refreshTokenCookieOptions = (): CookieOptions => ({
  ...baseCookieOptions,
  maxAge: durationToMs(env.JWT_REFRESH_TTL, 7 * 24 * 60 * 60 * 1000),
  path: '/api/auth',
})
