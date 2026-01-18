import { getRedisClient } from './redis.js'

export const getJson = async <T>(key: string): Promise<T | null> => {
  const client = getRedisClient()
  if (!client) return null

  try {
    const value = await client.get(key)
    if (!value) return null
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export const setJson = async (key: string, value: unknown, ttlSeconds?: number) => {
  const client = getRedisClient()
  if (!client) return

  try {
    const payload = JSON.stringify(value)
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, payload)
      return
    }
    await client.set(key, payload)
  } catch {
    // Ignore cache failures
  }
}

export const deleteKey = async (key: string) => {
  const client = getRedisClient()
  if (!client) return

  try {
    await client.del(key)
  } catch {
    // Ignore cache failures
  }
}

export const deleteByPattern = async (pattern: string) => {
  const client = getRedisClient()
  if (!client) return

  try {
    let cursor = '0'
    do {
      const result = await client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      })

      cursor = result.cursor
      if (result.keys.length) {
        await client.del(result.keys)
      }
    } while (cursor !== '0')
  } catch {
    // Ignore cache failures
  }
}
