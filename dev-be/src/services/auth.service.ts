import bcrypt from 'bcrypt'
import { randomUUID } from 'node:crypto'
import { prisma } from '../utils/db.js'
import { AppError } from '../utils/errors.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { env } from '../utils/env.js'
import { getRedisClient } from '../utils/redis.js'

const createSession = async (userId: number) => {
  const sessionId = randomUUID()
  const redis = getRedisClient()
  if (redis) {
    await redis.setEx(`session:${sessionId}`, env.SESSION_TTL_SECONDS, String(userId))
    await redis.sAdd(`user:sessions:${userId}`, sessionId)
  }
  return sessionId
}

const deleteSession = async (sessionId: string, userId?: number) => {
  const redis = getRedisClient()
  if (!redis) return

  await redis.del(`session:${sessionId}`)
  if (userId) {
    await redis.sRem(`user:sessions:${userId}`, sessionId)
  }
}

const issueTokens = async (user: { id: number; role: string }) => {
  const sessionId = await createSession(user.id)
  const accessToken = signAccessToken({ sub: String(user.id), role: user.role })
  const refreshToken = signRefreshToken({
    sub: String(user.id),
    role: user.role,
    sid: sessionId,
  })

  return { accessToken, refreshToken, sessionId }
}

export const registerUser = async (params: {
  email: string
  password: string
  name?: string
}) => {
  const email = params.email.trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw new AppError('Email already in use', 409)
  }

  const passwordHash = await bcrypt.hash(params.password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: params.name?.trim() || null,
    },
  })

  return user
}

export const loginUser = async (params: { email: string; password: string }) => {
  const email = params.email.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    throw new AppError('Invalid credentials', 401)
  }

  const passwordMatches = await bcrypt.compare(params.password, user.passwordHash)
  if (!passwordMatches) {
    throw new AppError('Invalid credentials', 401)
  }

  const tokens = await issueTokens({ id: user.id, role: user.role })

  return { user, tokens }
}

export const refreshTokens = async (refreshToken: string) => {
  let payload: ReturnType<typeof verifyRefreshToken>
  try {
    payload = verifyRefreshToken(refreshToken)
  } catch {
    throw new AppError('Invalid refresh token', 401)
  }
  if (!payload.sid) {
    throw new AppError('Invalid refresh token', 401)
  }

  const userId = Number(payload.sub)
  const redis = getRedisClient()
  if (redis) {
    const sessionValue = await redis.get(`session:${payload.sid}`)
    if (!sessionValue || Number(sessionValue) !== userId) {
      throw new AppError('Session expired', 401)
    }
  }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new AppError('User not found', 404)
  }

  await deleteSession(payload.sid, userId)
  const tokens = await issueTokens({ id: user.id, role: user.role })

  return { user, tokens }
}

export const logoutUser = async (refreshToken: string | undefined) => {
  if (!refreshToken) return

  try {
    const payload = verifyRefreshToken(refreshToken)
    if (payload.sid) {
      await deleteSession(payload.sid, Number(payload.sub))
    }
  } catch {
    // Ignore invalid tokens
  }
}
