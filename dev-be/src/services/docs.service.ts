import { prisma } from '../utils/db.js'
import { deleteByPattern, deleteKey, getJson, setJson } from '../utils/cache.js'
import { AppError } from '../utils/errors.js'

const DOC_LIST_TTL_SECONDS = 60 * 5
const DOC_ITEM_TTL_SECONDS = 60 * 10

const listCacheKey = (params: {
  userId: number
  page: number
  limit: number
  category?: string
  search?: string
}) => {
  return `docs:${params.userId}:page:${params.page}:limit:${params.limit}:category:${params.category ?? 'all'}:search:${params.search ?? 'all'}`
}

const itemCacheKey = (id: number) => `doc:${id}`

export const listDocuments = async (params: {
  userId: number
  page: number
  limit: number
  category?: string
  search?: string
}) => {
  const cacheKey = listCacheKey(params)
  const cached = await getJson<{ data: unknown; meta: unknown }>(cacheKey)
  if (cached) return cached

  const where: Record<string, unknown> = {
    userId: params.userId,
  }

  if (params.category) {
    const categoryId = Number(params.category)
    if (Number.isFinite(categoryId)) {
      where.categoryId = categoryId
    } else {
      where.category = {
        name: {
          equals: params.category,
          mode: 'insensitive',
        },
      }
    }
  }

  if (params.search) {
    where.name = {
      contains: params.search,
      mode: 'insensitive',
    }
  }

  const skip = (params.page - 1) * params.limit

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: params.limit,
    }),
    prisma.document.count({ where }),
  ])

  const payload = {
    data: documents,
    meta: {
      total,
      page: params.page,
      limit: params.limit,
    },
  }

  await setJson(cacheKey, payload, DOC_LIST_TTL_SECONDS)

  return payload
}

export const getDocument = async (params: { userId: number; id: number }) => {
  const cacheKey = itemCacheKey(params.id)
  const cached = await getJson<{
    id: number
    userId: number
  } & Record<string, unknown>>(cacheKey)

  if (cached && cached.userId === params.userId) {
    return cached
  }

  const document = await prisma.document.findFirst({
    where: { id: params.id, userId: params.userId },
    include: { category: true },
  })

  if (!document) {
    throw new AppError('Document not found', 404)
  }

  await setJson(cacheKey, document, DOC_ITEM_TTL_SECONDS)

  return document
}

export const createDocument = async (params: {
  userId: number
  name: string
  description?: string
  categoryId?: number
  s3Key: string
  s3Url: string
  fileSize: number
  fileType: string
}) => {
  const document = await prisma.document.create({
    data: {
      userId: params.userId,
      name: params.name,
      description: params.description || null,
      categoryId: params.categoryId || null,
      s3Key: params.s3Key,
      s3Url: params.s3Url,
      fileSize: params.fileSize,
      fileType: params.fileType,
    },
    include: { category: true },
  })

  await deleteByPattern(`docs:${params.userId}:*`)

  return document
}

export const updateDocument = async (params: {
  userId: number
  id: number
  name?: string
  description?: string | null
  categoryId?: number | null
}) => {
  const existing = await prisma.document.findFirst({
    where: { id: params.id, userId: params.userId },
  })

  if (!existing) {
    throw new AppError('Document not found', 404)
  }

  const document = await prisma.document.update({
    where: { id: params.id },
    data: {
      name: params.name || "",
      description: params.description || null,
      categoryId:
        params.categoryId || null,
        // params.categoryId === null ? null : params.categoryId,
    },
    include: { category: true },
  })

  await deleteKey(itemCacheKey(params.id))
  await deleteByPattern(`docs:${params.userId}:*`)

  return document
}

export const deleteDocument = async (params: { userId: number; id: number }) => {
  const existing = await prisma.document.findFirst({
    where: { id: params.id, userId: params.userId },
  })

  if (!existing) {
    throw new AppError('Document not found', 404)
  }

  await prisma.document.delete({ where: { id: params.id } })
  await deleteKey(itemCacheKey(params.id))
  await deleteByPattern(`docs:${params.userId}:*`)

  return existing
}
