import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken } from '../utils/jwt.js'
import { AppError } from '../utils/errors.js'
import type { UserRole } from '@prisma/client'

const isUserRole = (value: string): value is UserRole => {
  return value === 'USER' || value === 'ADMIN'
}

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const tokenFromCookie = req.cookies?.access_token as string | undefined
    const authHeader = req.headers.authorization
    const tokenFromHeader = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined
    const token = tokenFromCookie || tokenFromHeader

    if (!token) {
      throw new AppError('Unauthorized', 401)
    }

    const payload = verifyAccessToken(token)
    if (!isUserRole(payload.role)) {
      throw new AppError('Unauthorized', 401)
    }

    req.user = {
      id: Number(payload.sub),
      role: payload.role,
    }

    next()
  } catch (error) {
    if (error instanceof AppError) {
      return next(error)
    }
    next(new AppError('Unauthorized', 401))
  }
}

export const requireAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return next(new AppError('Forbidden', 403))
  }

  return next()
}
