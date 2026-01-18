import { prisma } from '../utils/db.js'
import { deleteKey, getJson, setJson } from '../utils/cache.js'

const CATEGORY_CACHE_KEY = 'categories:all'
const CATEGORY_TTL_SECONDS = 60 * 60

export const listCategories = async () => {
  const cached = await getJson<{ categories: unknown }>(CATEGORY_CACHE_KEY)
  if (cached) return cached

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
  })

  const payload = { categories }
  await setJson(CATEGORY_CACHE_KEY, payload, CATEGORY_TTL_SECONDS)

  return payload
}

export const createCategory = async (params: { name: string; color?: string }) => {
  const category = await prisma.category.create({
    data: {
      name: params.name || "",
      color: params.color || null,
    },
  })

  await deleteKey(CATEGORY_CACHE_KEY)

  return category
}
