import jwt from 'jsonwebtoken'
import { env } from './env.js'
import { AppError } from './errors.js'

export type TokenPayload = {
  sub: string
  role: string
  sid?: string
}

const requireSecret = (value: string, name: string) => {
  if (!value) {
    throw new AppError(`${name} is not configured`, 500)
  }
  return value
}

export const signAccessToken = (payload: TokenPayload) => {
  const secret = requireSecret(env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET')
  return jwt.sign(payload, secret)
}

export const signRefreshToken = (payload: TokenPayload & { sid: string }) => {
  const secret = requireSecret(env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET')
  return jwt.sign(payload, secret)
}

export const verifyAccessToken = (token: string) => {
  const secret = requireSecret(env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET')
  return jwt.verify(token, secret) as TokenPayload
}

export const verifyRefreshToken = (token: string) => {
  const secret = requireSecret(env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET')
  return jwt.verify(token, secret) as TokenPayload
}
