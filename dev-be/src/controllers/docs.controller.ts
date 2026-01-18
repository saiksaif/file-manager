import type { Request, Response } from 'express'
import { asyncHandler } from '../utils/async.js'
import { AppError } from '../utils/errors.js'
import { docsService, notificationsService } from '../services/index.js'
import { deleteFromS3, uploadToS3 } from '../utils/s3.js'
import { emitToAll, emitToUser } from '../utils/socket-events.js'

const toNumber = (value: string | number | undefined) => {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401)
  }

  const file = req.file as Express.Multer.File | undefined
  if (!file) {
    throw new AppError('File is required', 400)
  }

  const { name, description, categoryId } = req.body as {
    name?: string
    description?: string
    categoryId?: string | number
  }

  const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
  const safeName = name?.trim() || sanitizedOriginalName
  const key = `${req.user.id}/${Date.now()}-${sanitizedOriginalName}`

  const parsedCategoryId = toNumber(categoryId)
  if (categoryId !== undefined && parsedCategoryId === undefined) {
    throw new AppError('Invalid categoryId', 400)
  }

  const normalizedDescription = description?.trim() || undefined

  const s3Url = await uploadToS3({
    key,
    body: file.buffer,
    contentType: file.mimetype,
  })

  const createPayload: {
    userId: number
    name: string
    s3Key: string
    s3Url: string
    fileSize: number
    fileType: string
    description?: string
    categoryId?: number
  } = {
    userId: req.user.id,
    name: safeName,
    s3Key: key,
    s3Url,
    fileSize: file.size,
    fileType: file.mimetype,
  }

  if (normalizedDescription) {
    createPayload.description = normalizedDescription
  }
  if (parsedCategoryId !== undefined) {
    createPayload.categoryId = parsedCategoryId
  }

  let document
  try {
    document = await docsService.createDocument(createPayload)
  } catch (error) {
    await deleteFromS3(key).catch(() => undefined)
    throw error
  }

  emitToAll('document:uploaded', { document })
  try {
    const notification = await notificationsService.createNotification({
      userId: req.user.id,
      type: 'document:uploaded',
      title: 'Document uploaded',
      message: document.name,
    })
    emitToUser(req.user.id, 'notification:new', { notification })
  } catch {
    // Ignore notification failures
  }

  res.status(201).json({
    documentId: document.id,
    s3Url: document.s3Url,
    document,
  })
})

export const listDocuments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401)
  }

  const page = Math.max(Number(req.query.page) || 1, 1)
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100)

  const listParams: {
    userId: number
    page: number
    limit: number
    category?: string
    search?: string
  } = {
    userId: req.user.id,
    page,
    limit,
  }

  if (typeof req.query.category === 'string') {
    listParams.category = req.query.category
  }
  if (typeof req.query.search === 'string') {
    listParams.search = req.query.search
  }

  const payload = await docsService.listDocuments(listParams)

  res.json(payload)
})

export const getDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401)
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    throw new AppError('Invalid document id', 400)
  }

  const document = await docsService.getDocument({ userId: req.user.id, id })

  res.json({ document })
})

export const updateDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401)
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    throw new AppError('Invalid document id', 400)
  }

  const { name, description, categoryId } = req.body as {
    name?: string
    description?: string | null
    categoryId?: string | number | null
  }

  if (name !== undefined && !name.trim()) {
    throw new AppError('Name cannot be empty', 400)
  }

  const parsedCategoryId =
    categoryId === null || categoryId === ''
      ? null
      : toNumber(categoryId ?? undefined)

  if (
    categoryId !== undefined &&
    categoryId !== null &&
    categoryId !== '' &&
    parsedCategoryId === undefined
  ) {
    throw new AppError('Invalid categoryId', 400)
  }

  let normalizedDescription: string | null | undefined
  if (description === null) {
    normalizedDescription = null
  } else if (typeof description === 'string') {
    const trimmed = description.trim()
    normalizedDescription = trimmed ? trimmed : null
  }

  const updatePayload: {
    userId: number
    id: number
    name?: string
    description?: string | null
    categoryId?: number | null
  } = {
    userId: req.user.id,
    id,
  }

  if (name !== undefined) {
    updatePayload.name = name.trim()
  }
  if (normalizedDescription !== undefined) {
    updatePayload.description = normalizedDescription
  }
  if (parsedCategoryId !== undefined) {
    updatePayload.categoryId = parsedCategoryId
  }

  const document = await docsService.updateDocument(updatePayload)

  emitToAll('document:updated', { document })
  try {
    const notification = await notificationsService.createNotification({
      userId: req.user.id,
      type: 'document:updated',
      title: 'Document updated',
      message: document.name,
    })
    emitToUser(req.user.id, 'notification:new', { notification })
  } catch {
    // Ignore notification failures
  }

  res.json({ document })
})

export const deleteDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Unauthorized', 401)
  }

  const id = Number(req.params.id)
  if (!Number.isFinite(id)) {
    throw new AppError('Invalid document id', 400)
  }

  const document = await docsService.getDocument({ userId: req.user.id, id })

  await deleteFromS3(`${document.s3Key}`)
  await docsService.deleteDocument({ userId: req.user.id, id })

  emitToAll('document:deleted', { documentId: document.id })
  try {
    const notification = await notificationsService.createNotification({
      userId: req.user.id,
      type: 'document:deleted',
      title: 'Document deleted',
      message: `${document.name}`,
    })
    emitToUser(req.user.id, 'notification:new', { notification })
  } catch {
    // Ignore notification failures
  }

  res.status(204).send()
})
