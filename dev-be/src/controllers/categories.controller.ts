import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/async.js'
import { AppError } from '../utils/errors.js'
import { categoriesService } from '../services/index.js'
import { emitToAll } from '../utils/socket-events.js'

export const listCategories = asyncHandler(async (_req: Request, res: Response) => {
  const payload = await categoriesService.listCategories()
  res.json(payload)
})

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const { name, color } = req.body as { name?: string; color?: string }

  if (!name || !name.trim()) {
    throw new AppError('Category name is required', 400)
  }

  const payload: { name: string; color?: string } = {
    name: name.trim(),
  }
  if (color?.trim()) {
    payload.color = color.trim()
  }

  const category = await categoriesService.createCategory(payload)

  emitToAll('category:updated', { category })

  res.status(201).json({ category })
})
