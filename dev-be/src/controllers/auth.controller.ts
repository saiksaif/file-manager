import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/async.js'
import { AppError } from '../utils/errors.js'
import { accessTokenCookieOptions, refreshTokenCookieOptions } from '../utils/cookies.js'
import { authService } from '../services/index.js'
import { prisma } from '../utils/db.js'

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, name } = req.body as {
    email?: string
    password?: string
    name?: string
  }

  if (!email || !password) {
    throw new AppError('Email and password are required', 400)
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters', 400)
  }

  const registerPayload: { email: string; password: string; name?: string } = {
    email,
    password,
  }
  if (name?.trim()) {
    registerPayload.name = name.trim()
  }

  await authService.registerUser(registerPayload)
  const { user, tokens } = await authService.loginUser({ email, password })

  res.cookie('access_token', tokens.accessToken, accessTokenCookieOptions())
  res.cookie('refresh_token', tokens.refreshToken, refreshTokenCookieOptions())

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  })
})

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as {
    email?: string
    password?: string
  }

  if (!email || !password) {
    throw new AppError('Email and password are required', 400)
  }

  const { user, tokens } = await authService.loginUser({ email, password })

  res.cookie('access_token', tokens.accessToken, accessTokenCookieOptions())
  res.cookie('refresh_token', tokens.refreshToken, refreshTokenCookieOptions())

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  })
})

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token as string | undefined
  if (!refreshToken) {
    throw new AppError('Refresh token missing', 401)
  }

  const { user, tokens } = await authService.refreshTokens(refreshToken)

  res.cookie('access_token', tokens.accessToken, accessTokenCookieOptions())
  res.cookie('refresh_token', tokens.refreshToken, refreshTokenCookieOptions())

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  })
})

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token as string | undefined
  await authService.logoutUser(refreshToken)

  res.clearCookie('access_token', accessTokenCookieOptions())
  res.clearCookie('refresh_token', refreshTokenCookieOptions())

  res.status(204).send()
})

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401)
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  if (!user) {
    throw new AppError('User not found', 404)
  }

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  })
})
