import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/async.js'
import { AppError } from '../utils/errors.js'
import { notificationsService } from '../services/index.js'

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401)
  }

  const page = Math.max(Number(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100)

  const payload = await notificationsService.listNotifications({
    userId: req.user.id,
    page,
    limit,
  })

  res.json(payload)
})

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401)
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    throw new AppError('Invalid notification id', 400)
  }

  const updated = await notificationsService.markNotificationRead({
    userId: req.user.id,
    id,
  })

  if (!updated) {
    throw new AppError('Notification not found', 404)
  }

  res.status(204).send()
})
